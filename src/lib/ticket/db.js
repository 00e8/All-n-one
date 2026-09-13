// © Author:
// https://discord.gg/wwv
//
// Ticket persistence layer. Backed by the same PostgreSQL database as
// the rest of the bot (see data/pg.js) instead of a separate SQLite
// file, so it lives alongside everything else and survives on the
// same deploy/backup story. Panels store their categories as a JSONB
// array on the panel row (same shape the original ticket system used
// in-memory) rather than a separate relational table, which keeps
// reads for the panel-builder UI to a single query.

const { pool } = require('../../data/pg');

let ready = null;

function init() {
    if (ready) return ready;
    ready = pool.query(`
        CREATE TABLE IF NOT EXISTS ticket_guilds (
            guild_id TEXT PRIMARY KEY,
            prefix TEXT,
            blacklisted_users JSONB NOT NULL DEFAULT '[]',
            staff_roles JSONB NOT NULL DEFAULT '[]',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS ticket_panels (
            panel_id TEXT PRIMARY KEY,
            guild_id TEXT NOT NULL,
            name TEXT,
            channel_id TEXT,
            message_id TEXT,
            panel_message JSONB NOT NULL DEFAULT '{}',
            categories JSONB NOT NULL DEFAULT '[]',
            select_menu_config JSONB NOT NULL DEFAULT '{}',
            logs JSONB NOT NULL DEFAULT '{}',
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS ticket_panels_guild_id ON ticket_panels (guild_id);
        CREATE TABLE IF NOT EXISTS ticket_tickets (
            ticket_id TEXT PRIMARY KEY,
            guild_id TEXT NOT NULL,
            panel_id TEXT,
            category_id TEXT,
            user_id TEXT NOT NULL,
            channel_id TEXT,
            added_users JSONB NOT NULL DEFAULT '[]',
            removed_users JSONB NOT NULL DEFAULT '[]',
            control_message_id TEXT,
            rating JSONB,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS ticket_tickets_guild_id ON ticket_tickets (guild_id);
        CREATE INDEX IF NOT EXISTS ticket_tickets_channel_id ON ticket_tickets (channel_id);
        CREATE INDEX IF NOT EXISTS ticket_tickets_guild_user ON ticket_tickets (guild_id, user_id);
    `).then(() => true);
    return ready;
}

function randomId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function defaultCategorySettings(overrides = {}) {
    return {
        pingUser: true,
        pingRole: false,
        userCanClose: true,
        maxTicketsPerUser: 1,
        dmUserOnOpen: true,
        dmUserOnClose: true,
        welcomeMessage: null,
        ...overrides,
    };
}

function rowToGuild(row) {
    if (!row) return null;
    return {
        guildId: row.guild_id,
        prefix: row.prefix,
        blacklistedUsers: row.blacklisted_users || [],
        staffRoles: row.staff_roles || [],
    };
}

function rowToPanel(row) {
    if (!row) return null;
    return {
        panelId: row.panel_id,
        guildId: row.guild_id,
        name: row.name,
        channelId: row.channel_id,
        messageId: row.message_id,
        panelMessage: row.panel_message || {},
        categories: row.categories || [],
        selectMenuConfig: row.select_menu_config || {},
        logs: row.logs || {},
        isActive: row.is_active,
    };
}

function rowToTicket(row) {
    if (!row) return null;
    return {
        ticketId: row.ticket_id,
        guildId: row.guild_id,
        panelId: row.panel_id,
        categoryId: row.category_id,
        userId: row.user_id,
        channelId: row.channel_id,
        addedUsers: row.added_users || [],
        removedUsers: row.removed_users || [],
        controlMessageId: row.control_message_id,
        rating: row.rating,
    };
}

class TicketDatabase {
    async _ready() {
        await init();
    }

    // ---------- Guilds ----------

    async getGuild(guildId) {
        await this._ready();
        const res = await pool.query('SELECT * FROM ticket_guilds WHERE guild_id = $1', [guildId]);
        return rowToGuild(res.rows[0]);
    }

    async createGuild(guildId, data = {}) {
        await this._ready();
        const existing = await this.getGuild(guildId);
        if (existing) return existing;
        const res = await pool.query(
            `INSERT INTO ticket_guilds (guild_id, prefix, blacklisted_users, staff_roles)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (guild_id) DO UPDATE SET guild_id = EXCLUDED.guild_id
             RETURNING *`,
            [guildId, data.prefix || null, JSON.stringify(data.blacklistedUsers || []), JSON.stringify(data.staffRoles || [])]
        );
        return rowToGuild(res.rows[0]);
    }

    async updateGuild(guildId, data) {
        await this.createGuild(guildId);
        const sets = [];
        const params = [guildId];
        if (data.prefix !== undefined) { params.push(data.prefix); sets.push(`prefix = $${params.length}`); }
        if (data.blacklistedUsers !== undefined) { params.push(JSON.stringify(data.blacklistedUsers)); sets.push(`blacklisted_users = $${params.length}::jsonb`); }
        if (data.staffRoles !== undefined) { params.push(JSON.stringify(data.staffRoles)); sets.push(`staff_roles = $${params.length}::jsonb`); }
        if (!sets.length) return this.getGuild(guildId);
        sets.push('updated_at = now()');
        const res = await pool.query(`UPDATE ticket_guilds SET ${sets.join(', ')} WHERE guild_id = $1 RETURNING *`, params);
        return rowToGuild(res.rows[0]);
    }

    async deleteGuild(guildId) {
        await this._ready();
        const res = await pool.query('DELETE FROM ticket_guilds WHERE guild_id = $1 RETURNING *', [guildId]);
        return rowToGuild(res.rows[0]);
    }

    async setPrefix(guildId, prefix) {
        return this.updateGuild(guildId, { prefix });
    }

    async getPrefix(guildId) {
        const guild = await this.getGuild(guildId);
        return guild?.prefix || '!';
    }

    async addBlacklistedUser(guildId, userId, reason, blacklistedBy) {
        const guild = await this.createGuild(guildId);
        const list = guild.blacklistedUsers.filter(u => u.userId !== userId);
        list.push({ userId, reason, blacklistedBy, blacklistedAt: new Date().toISOString() });
        return this.updateGuild(guildId, { blacklistedUsers: list });
    }

    async removeBlacklistedUser(guildId, userId) {
        const guild = await this.createGuild(guildId);
        const list = guild.blacklistedUsers.filter(u => u.userId !== userId);
        return this.updateGuild(guildId, { blacklistedUsers: list });
    }

    async isUserBlacklisted(guildId, userId) {
        const guild = await this.getGuild(guildId);
        return guild?.blacklistedUsers?.some(u => u.userId === userId) || false;
    }

    async getBlacklistedUsers(guildId) {
        const guild = await this.getGuild(guildId);
        return guild?.blacklistedUsers || [];
    }

    async setStaffRoles(guildId, roles) {
        return this.updateGuild(guildId, { staffRoles: roles });
    }

    async addStaffRole(guildId, roleId) {
        const guild = await this.createGuild(guildId);
        if (guild.staffRoles.includes(roleId)) return guild;
        return this.updateGuild(guildId, { staffRoles: [...guild.staffRoles, roleId] });
    }

    async removeStaffRole(guildId, roleId) {
        const guild = await this.createGuild(guildId);
        return this.updateGuild(guildId, { staffRoles: guild.staffRoles.filter(r => r !== roleId) });
    }

    async getStaffRoles(guildId) {
        const guild = await this.getGuild(guildId);
        return guild?.staffRoles || [];
    }

    // ---------- Panels ----------

    async createPanel(guildId, panelData = {}) {
        await this._ready();
        const panelId = randomId('panel');
        const panelMessage = panelData.panelMessage || { title: 'Panel', description: 'Select a category below to create a ticket', imageUrl: null };
        const selectMenuConfig = panelData.selectMenuConfig || { placeholder: 'Select a ticket category', minValues: 1, maxValues: 1 };
        const res = await pool.query(
            `INSERT INTO ticket_panels (panel_id, guild_id, name, panel_message, categories, select_menu_config, logs, is_active)
             VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8)
             RETURNING *`,
            [panelId, guildId, panelData.name || 'Panel', JSON.stringify(panelMessage), JSON.stringify(panelData.categories || []), JSON.stringify(selectMenuConfig), JSON.stringify(panelData.logs || {}), panelData.isActive !== false]
        );
        return rowToPanel(res.rows[0]);
    }

    async getPanel(panelId) {
        await this._ready();
        const res = await pool.query('SELECT * FROM ticket_panels WHERE panel_id = $1', [panelId]);
        return rowToPanel(res.rows[0]);
    }

    async getGuildPanels(guildId) {
        await this._ready();
        const res = await pool.query('SELECT * FROM ticket_panels WHERE guild_id = $1 ORDER BY created_at ASC', [guildId]);
        return res.rows.map(rowToPanel);
    }

    async getActivePanels(guildId) {
        await this._ready();
        const res = await pool.query('SELECT * FROM ticket_panels WHERE guild_id = $1 AND is_active = true', [guildId]);
        return res.rows.map(rowToPanel);
    }

    async updatePanel(panelId, data) {
        await this._ready();
        const sets = [];
        const params = [panelId];
        const map = {
            name: ['name', v => v],
            channelId: ['channel_id', v => v],
            messageId: ['message_id', v => v],
            panelMessage: ['panel_message', v => JSON.stringify(v)],
            categories: ['categories', v => JSON.stringify(v)],
            selectMenuConfig: ['select_menu_config', v => JSON.stringify(v)],
            logs: ['logs', v => JSON.stringify(v)],
            isActive: ['is_active', v => v],
        };
        for (const [key, [col, transform]] of Object.entries(map)) {
            if (data[key] === undefined) continue;
            params.push(transform(data[key]));
            const cast = ['panel_message', 'categories', 'select_menu_config', 'logs'].includes(col) ? '::jsonb' : '';
            sets.push(`${col} = $${params.length}${cast}`);
        }
        if (!sets.length) return this.getPanel(panelId);
        sets.push('updated_at = now()');
        const res = await pool.query(`UPDATE ticket_panels SET ${sets.join(', ')} WHERE panel_id = $1 RETURNING *`, params);
        return rowToPanel(res.rows[0]);
    }

    async setPanelName(panelId, name) {
        return this.updatePanel(panelId, { name });
    }

    async setPanelLogs(panelId, logs) {
        return this.updatePanel(panelId, { logs });
    }

    async setPanelSelectMenu(panelId, selectMenuConfig) {
        const p = await this.getPanel(panelId);
        return this.updatePanel(panelId, { selectMenuConfig: { ...p.selectMenuConfig, ...selectMenuConfig } });
    }

    async setPanelMessage(panelId, panelMessage) {
        return this.updatePanel(panelId, { panelMessage });
    }

    async setPanelMessageId(panelId, channelId, messageId) {
        return this.updatePanel(panelId, { channelId, messageId });
    }

    async togglePanelActive(panelId) {
        const panel = await this.getPanel(panelId);
        return this.updatePanel(panelId, { isActive: !panel.isActive });
    }

    async deletePanel(panelId) {
        await this._ready();
        const res = await pool.query('DELETE FROM ticket_panels WHERE panel_id = $1 RETURNING *', [panelId]);
        return rowToPanel(res.rows[0]);
    }

    // ---------- Categories (stored as a JSONB array on the panel row) ----------

    async addCategory(panelId, categoryData) {
        const panel = await this.getPanel(panelId);
        if (!panel) return null;
        const categoryId = randomId('cat');
        const category = {
            categoryId,
            name: categoryData.name,
            description: categoryData.description ?? null,
            emoji: categoryData.emoji ?? null,
            supportRoles: categoryData.supportRoles || [],
            ticketChannelCategory: categoryData.ticketChannelCategory ?? null,
            namingFormat: categoryData.namingFormat || '{username}',
            settings: defaultCategorySettings(categoryData.settings),
            isActive: true,
        };
        panel.categories.push(category);
        return this.updatePanel(panelId, { categories: panel.categories });
    }

    async updateCategory(panelId, categoryId, data) {
        const panel = await this.getPanel(panelId);
        if (!panel) return null;
        const categories = panel.categories.map(c => (c.categoryId === categoryId ? { ...c, ...data } : c));
        return this.updatePanel(panelId, { categories });
    }

    async removeCategory(panelId, categoryId) {
        const panel = await this.getPanel(panelId);
        if (!panel) return null;
        const categories = panel.categories.filter(c => c.categoryId !== categoryId);
        return this.updatePanel(panelId, { categories });
    }

    async getCategory(panelId, categoryId) {
        const panel = await this.getPanel(panelId);
        return panel?.categories?.find(c => c.categoryId === categoryId) || null;
    }

    async toggleCategoryActive(panelId, categoryId) {
        const panel = await this.getPanel(panelId);
        if (!panel) return null;
        const categories = panel.categories.map(c => (c.categoryId === categoryId ? { ...c, isActive: !c.isActive } : c));
        return this.updatePanel(panelId, { categories });
    }

    async updateCategorySettings(panelId, categoryId, settings) {
        const panel = await this.getPanel(panelId);
        if (!panel) return null;
        const categories = panel.categories.map(c => (c.categoryId === categoryId ? { ...c, settings: { ...c.settings, ...settings } } : c));
        return this.updatePanel(panelId, { categories });
    }

    async addCategorySupportRole(panelId, categoryId, roleId) {
        const panel = await this.getPanel(panelId);
        if (!panel) return null;
        const categories = panel.categories.map(c => {
            if (c.categoryId !== categoryId) return c;
            const supportRoles = c.supportRoles.includes(roleId) ? c.supportRoles : [...c.supportRoles, roleId];
            return { ...c, supportRoles };
        });
        return this.updatePanel(panelId, { categories });
    }

    async removeCategorySupportRole(panelId, categoryId, roleId) {
        const panel = await this.getPanel(panelId);
        if (!panel) return null;
        const categories = panel.categories.map(c => (c.categoryId === categoryId ? { ...c, supportRoles: c.supportRoles.filter(r => r !== roleId) } : c));
        return this.updatePanel(panelId, { categories });
    }

    // ---------- Tickets ----------

    async createTicket(guildId, panelId, categoryId, userId, data = {}) {
        await this._ready();
        const ticketId = randomId('ticket');
        const res = await pool.query(
            `INSERT INTO ticket_tickets (ticket_id, guild_id, panel_id, category_id, user_id, channel_id, added_users, removed_users, control_message_id, rating)
             VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10::jsonb)
             RETURNING *`,
            [ticketId, guildId, panelId, categoryId, userId, data.channelId || null, JSON.stringify(data.addedUsers || []), JSON.stringify(data.removedUsers || []), data.controlMessageId || null, data.rating ? JSON.stringify(data.rating) : null]
        );
        return rowToTicket(res.rows[0]);
    }

    async getTicket(ticketId) {
        await this._ready();
        const res = await pool.query('SELECT * FROM ticket_tickets WHERE ticket_id = $1', [ticketId]);
        return rowToTicket(res.rows[0]);
    }

    async getTicketByChannel(channelId) {
        await this._ready();
        const res = await pool.query('SELECT * FROM ticket_tickets WHERE channel_id = $1', [channelId]);
        return rowToTicket(res.rows[0]);
    }

    async getTicketByChannelAny(channelId) {
        return this.getTicketByChannel(channelId);
    }

    async isTicketChannel(channelId) {
        return !!(await this.getTicketByChannel(channelId));
    }

    async getUserOpenTickets(guildId, userId) {
        await this._ready();
        const res = await pool.query('SELECT * FROM ticket_tickets WHERE guild_id = $1 AND user_id = $2', [guildId, userId]);
        return res.rows.map(rowToTicket);
    }

    async getUserCategoryOpenTickets(guildId, userId, categoryId) {
        await this._ready();
        const res = await pool.query('SELECT * FROM ticket_tickets WHERE guild_id = $1 AND user_id = $2 AND category_id = $3', [guildId, userId, categoryId]);
        return res.rows.map(rowToTicket);
    }

    async getGuildOpenTickets(guildId) {
        return this.getGuildTickets(guildId);
    }

    async getGuildTickets(guildId) {
        await this._ready();
        const res = await pool.query('SELECT * FROM ticket_tickets WHERE guild_id = $1', [guildId]);
        return res.rows.map(rowToTicket);
    }

    async getPanelTickets(panelId) {
        await this._ready();
        const res = await pool.query('SELECT * FROM ticket_tickets WHERE panel_id = $1', [panelId]);
        return res.rows.map(rowToTicket);
    }

    async getCategoryTickets(panelId, categoryId) {
        await this._ready();
        const res = await pool.query('SELECT * FROM ticket_tickets WHERE panel_id = $1 AND category_id = $2', [panelId, categoryId]);
        return res.rows.map(rowToTicket);
    }

    async getUserTickets(guildId, userId) {
        return this.getUserOpenTickets(guildId, userId);
    }

    async updateTicket(ticketId, data) {
        await this._ready();
        const sets = [];
        const params = [ticketId];
        const map = {
            channelId: ['channel_id', v => v, false],
            addedUsers: ['added_users', v => JSON.stringify(v), true],
            removedUsers: ['removed_users', v => JSON.stringify(v), true],
            controlMessageId: ['control_message_id', v => v, false],
            rating: ['rating', v => JSON.stringify(v), true],
        };
        for (const [key, [col, transform, isJsonb]] of Object.entries(map)) {
            if (data[key] === undefined) continue;
            params.push(transform(data[key]));
            sets.push(`${col} = $${params.length}${isJsonb ? '::jsonb' : ''}`);
        }
        if (!sets.length) return this.getTicket(ticketId);
        sets.push('updated_at = now()');
        const res = await pool.query(`UPDATE ticket_tickets SET ${sets.join(', ')} WHERE ticket_id = $1 RETURNING *`, params);
        return rowToTicket(res.rows[0]);
    }

    async setTicketChannel(ticketId, channelId) {
        return this.updateTicket(ticketId, { channelId });
    }

    async setTicketControlMessage(ticketId, controlMessageId) {
        return this.updateTicket(ticketId, { controlMessageId });
    }

    async addTicketUser(ticketId, userId, addedBy) {
        const ticket = await this.getTicket(ticketId);
        if (!ticket) return null;
        const addedUsers = [...ticket.addedUsers, { userId, addedBy, addedAt: new Date().toISOString() }];
        return this.updateTicket(ticketId, { addedUsers });
    }

    async removeTicketUser(ticketId, userId, removedBy) {
        const ticket = await this.getTicket(ticketId);
        if (!ticket) return null;
        const removedUsers = [...ticket.removedUsers, { userId, removedBy, removedAt: new Date().toISOString() }];
        const addedUsers = ticket.addedUsers.filter(u => u.userId !== userId);
        return this.updateTicket(ticketId, { addedUsers, removedUsers });
    }

    async isUserAdded(ticketId, userId) {
        const ticket = await this.getTicket(ticketId);
        return ticket?.addedUsers?.some(u => u.userId === userId) || false;
    }

    async getAddedUsers(ticketId) {
        const ticket = await this.getTicket(ticketId);
        return ticket?.addedUsers || [];
    }

    async rateTicket(ticketId, stars, feedback = null) {
        return this.updateTicket(ticketId, { rating: { stars, feedback, ratedAt: new Date().toISOString() } });
    }

    async deleteTicket(ticketId) {
        await this._ready();
        const res = await pool.query('DELETE FROM ticket_tickets WHERE ticket_id = $1 RETURNING *', [ticketId]);
        return rowToTicket(res.rows[0]);
    }

    async deleteGuildTickets(guildId) {
        await this._ready();
        const res = await pool.query('DELETE FROM ticket_tickets WHERE guild_id = $1', [guildId]);
        return { deletedCount: res.rowCount };
    }

    async deletePanelTickets(panelId) {
        await this._ready();
        const res = await pool.query('DELETE FROM ticket_tickets WHERE panel_id = $1', [panelId]);
        return { deletedCount: res.rowCount };
    }

    async getUserTicketCount(guildId, userId) {
        await this._ready();
        const res = await pool.query('SELECT COUNT(*)::int AS c FROM ticket_tickets WHERE guild_id = $1 AND user_id = $2', [guildId, userId]);
        return res.rows[0].c;
    }

    async getUserOpenTicketCount(guildId, userId) {
        return this.getUserTicketCount(guildId, userId);
    }

    async getAllGuilds() {
        await this._ready();
        const res = await pool.query('SELECT * FROM ticket_guilds');
        return res.rows.map(rowToGuild);
    }

    async getControlMessage(ticketId) {
        const ticket = await this.getTicket(ticketId);
        return ticket?.controlMessageId;
    }

    async getGuildCount() {
        await this._ready();
        const res = await pool.query('SELECT COUNT(*)::int AS c FROM ticket_guilds');
        return res.rows[0].c;
    }

    async getTotalTicketCount() {
        await this._ready();
        const res = await pool.query('SELECT COUNT(*)::int AS c FROM ticket_tickets');
        return res.rows[0].c;
    }
}

module.exports = new TicketDatabase();

/**
 * Project: hana
 * Author: nunu.58 (shutup)
 * Organization: HYZEX Development
 * GitHub: https://github.com/
 * License: Custom
 * © 2026 HYZEX Development. All rights reserved.
 */
