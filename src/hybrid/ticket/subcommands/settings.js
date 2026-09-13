// © Author:
// https://discord.gg/wwv
//
// /ticket settings — server-wide ticket settings (prefix info, staff
// roles, blacklist), ported from the standalone ticket bot's
// `settings` command.

const {
    PermissionFlagsBits, MessageFlags, ButtonStyle, ModalBuilder, TextInputBuilder,
    TextInputStyle, ActionRowBuilder, ButtonBuilder, ContainerBuilder, TextDisplayBuilder,
    SeparatorBuilder, SeparatorSpacingSize, StringSelectMenuBuilder, RoleSelectMenuBuilder,
} = require('discord.js');
const db = require('../../../lib/ticket/db');
const emoji = require('../../../lib/ticket/emoji');

const sessions = {};

async function execute(ctx) {
    if (!ctx.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return ctx.reply({
            components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Permission Denied\n-# You need **ManageServer** to use this command.`))],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });
    }

    const sessionKey = `${ctx.guild.id}_${ctx.author.id}`;
    sessions[sessionKey] = { view: 'MAIN', temp: {}, page: 0 };

    const c = await render(ctx, sessions[sessionKey]);
    const msg = await ctx.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
    collector(ctx, msg, sessionKey);
}

async function render(ctx, st) {
    if (st.view === 'MAIN') return main(ctx);
    if (st.view === 'PREFIX') return prefixView(ctx);
    if (st.view === 'STAFF') return staff(ctx);
    if (st.view === 'BLACKLIST') return blacklist(ctx, st);
    if (st.view === 'GUIDE') return guide();
}

async function main(ctx) {
    const guild = await db.getGuild(ctx.guild.id);
    const prefix = guild?.prefix || '!';
    const staffRoles = await db.getStaffRoles(ctx.guild.id);
    const blacklisted = await db.getBlacklistedUsers(ctx.guild.id);

    const c = new ContainerBuilder();
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `-# Ticket Settings\n-# Prefix \`${prefix}\`\n-# Staff Roles ${staffRoles.length} configured\n-# Blacklisted Users ${blacklisted.length} users`
    ));
    c.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('settings_prefix').setLabel('Change Prefix').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('settings_staff').setLabel('Staff Roles').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('settings_blacklist').setLabel('Blacklist').setStyle(ButtonStyle.Danger)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('settings_guide').setLabel('View Guide').setStyle(ButtonStyle.Success)
        )
    );

    return c;
}

async function prefixView(ctx) {
    const guild = await db.getGuild(ctx.guild.id);
    const prefix = guild?.prefix || '!';

    const c = new ContainerBuilder();
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Change Prefix\n-# Current prefix \`${prefix}\`\n-# This only affects text-command replies inside the ticket system's own help text — the bot's global prefix is unaffected.\n-# Click the button below to set a new prefix`));
    c.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    c.addActionRowComponents(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prefix_change').setLabel('Set New Prefix').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('settings_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
    ));

    return c;
}

async function staff(ctx) {
    const staffRoles = await db.getStaffRoles(ctx.guild.id);
    const rolesText = staffRoles.length ? staffRoles.map(r => `<@&${r}>`).join(' ') : 'No staff roles configured';

    const c = new ContainerBuilder();
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Staff Roles\n-# ${rolesText}\n-# ${staffRoles.length}/10 roles configured`));
    c.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    c.addActionRowComponents(new ActionRowBuilder().addComponents(
        new RoleSelectMenuBuilder().setCustomId('staff_roles_select').setPlaceholder('Select staff roles (up to 10)').setMinValues(0).setMaxValues(10)
    ));
    c.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    c.addActionRowComponents(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('settings_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
    ));

    return c;
}

async function blacklist(ctx, st) {
    const blacklisted = await db.getBlacklistedUsers(ctx.guild.id);

    const itemsPerPage = 5;
    const totalPages = Math.ceil(Math.max(blacklisted.length, 1) / itemsPerPage);
    const currentPage = st.page || 0;
    const startIdx = currentPage * itemsPerPage;
    const endIdx = Math.min(startIdx + itemsPerPage, blacklisted.length);
    const pageItems = blacklisted.slice(startIdx, endIdx);

    let listText = blacklisted.length === 0 ? 'No blacklisted users' : '';
    for (const bl of pageItems) listText += `<@${bl.userId}> - ${bl.reason || 'No reason'}\n`;

    const c = new ContainerBuilder();
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Blacklisted Users\n-# Page ${currentPage + 1}/${totalPages}\n\n${listText}`));
    c.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

    c.addActionRowComponents(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('blacklist_add').setLabel('Add User').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('blacklist_remove').setLabel('Remove User').setStyle(ButtonStyle.Success).setDisabled(blacklisted.length === 0)
    ));

    c.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    const navRow = new ActionRowBuilder();
    if (currentPage > 0) navRow.addComponents(new ButtonBuilder().setCustomId('blacklist_prev').setLabel('Previous').setStyle(ButtonStyle.Secondary));
    if (currentPage < totalPages - 1 && blacklisted.length > itemsPerPage) navRow.addComponents(new ButtonBuilder().setCustomId('blacklist_next').setLabel('Next').setStyle(ButtonStyle.Secondary));
    navRow.addComponents(new ButtonBuilder().setCustomId('settings_back').setLabel('Back').setStyle(ButtonStyle.Secondary));
    c.addActionRowComponents(navRow);

    return c;
}

function guide() {
    const c = new ContainerBuilder();
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `-# Settings Guide\n-# **Staff Roles**\n-# Users with staff roles have elevated permissions across all tickets\n-# Close any ticket\n-# Add|remove users from tickets\n-# **Staff Roles vs Support Roles**\n-# Staff roles are server-wide and work on all tickets. Support roles are category-specific (set in \`/ticket panel\`) and only grant access to tickets in their assigned categories.\n-# **Blacklist**\n-# Blacklisted users cannot create new tickets. Existing tickets remain accessible but no new tickets can be opened.`
    ));
    c.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    c.addActionRowComponents(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('settings_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
    ));
    return c;
}

function msgBox(title, text) {
    return new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${title} ${text}`));
}

async function update(ctx, msg, st) {
    try {
        await msg.edit({ components: [await render(ctx, st)], flags: MessageFlags.IsComponentsV2 });
    } catch (e) {
        console.error('Settings update failed:', e);
    }
}

function collector(ctx, msg, sessionKey) {
    const col = msg.createMessageComponentCollector({ filter: i => i.user.id === ctx.author.id, time: 600_000 });
    const st = sessions[sessionKey];

    col.on('collect', async i => {
        try {
            const id = i.customId;

            if (id === 'settings_back') {
                await i.deferUpdate();
                st.view = 'MAIN'; st.page = 0;
                await update(ctx, msg, st);
                return;
            }

            if (id === 'settings_prefix') {
                await i.deferUpdate();
                st.view = 'PREFIX';
                await update(ctx, msg, st);
                return;
            }

            if (id === 'prefix_change') {
                const modal = new ModalBuilder().setCustomId(`prefix_modal_${i.id}`).setTitle('Change Prefix');
                modal.addComponents(new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('prefix').setLabel('New prefix (1-3 characters)').setStyle(TextInputStyle.Short).setMaxLength(3).setRequired(true)
                ));
                await i.showModal(modal);
                try {
                    const sub = await i.awaitModalSubmit({ filter: s => s.customId === `prefix_modal_${i.id}`, time: 120_000 });
                    await sub.deferUpdate();
                    await db.setPrefix(ctx.guild.id, sub.fields.getTextInputValue('prefix').trim());
                    await update(ctx, msg, st);
                } catch (e) {}
                return;
            }

            if (id === 'settings_staff') {
                await i.deferUpdate();
                st.view = 'STAFF';
                await update(ctx, msg, st);
                return;
            }

            if (id === 'staff_roles_select') {
                await i.deferUpdate();
                await db.setStaffRoles(ctx.guild.id, i.values);
                await update(ctx, msg, st);
                return;
            }

            if (id === 'settings_blacklist') {
                await i.deferUpdate();
                st.view = 'BLACKLIST'; st.page = 0;
                await update(ctx, msg, st);
                return;
            }

            if (id === 'blacklist_add') {
                const modal = new ModalBuilder().setCustomId(`blacklist_add_${i.id}`).setTitle('Blacklist User');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('userId').setLabel('User ID').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reason').setLabel('Reason (optional)').setStyle(TextInputStyle.Paragraph).setMaxLength(500).setRequired(false))
                );
                await i.showModal(modal);
                try {
                    const sub = await i.awaitModalSubmit({ filter: s => s.customId === `blacklist_add_${i.id}`, time: 120_000 });
                    await sub.deferUpdate();
                    const rawUserId = sub.fields.getTextInputValue('userId').trim();
                    const mention = rawUserId.match(/^<@!?(\d+)>$/);
                    const userId = mention ? mention[1] : rawUserId;
                    const reason = sub.fields.getTextInputValue('reason')?.trim() || null;

                    if (!/^\d{17,20}$/.test(userId)) {
                        await msg.edit({ components: [msgBox('Invalid User ID', 'Please provide a valid user ID or mention.')], flags: MessageFlags.IsComponentsV2 });
                        return;
                    }

                    await db.addBlacklistedUser(ctx.guild.id, userId, reason, ctx.author.id);
                    await update(ctx, msg, st);
                } catch (e) {}
                return;
            }

            if (id === 'blacklist_remove') {
                const blacklisted = await db.getBlacklistedUsers(ctx.guild.id);
                const opts = blacklisted.map(bl => ({ label: bl.userId, value: bl.userId, description: bl.reason?.substring(0, 100) || 'No reason' }));

                await i.deferUpdate();

                const removeContainer = new ContainerBuilder();
                removeContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent('-# Remove from Blacklist\nSelect user to remove'));
                removeContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
                removeContainer.addActionRowComponents(new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder().setCustomId('blacklist_remove_select').setPlaceholder('Select user to remove').addOptions(opts)
                ));
                removeContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
                removeContainer.addActionRowComponents(new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('blacklist_remove_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
                ));

                await msg.edit({ components: [removeContainer], flags: MessageFlags.IsComponentsV2 });
                return;
            }

            if (id === 'blacklist_remove_select') {
                await i.deferUpdate();
                await db.removeBlacklistedUser(ctx.guild.id, i.values[0]);
                st.page = 0;
                await update(ctx, msg, st);
                return;
            }

            if (id === 'blacklist_remove_cancel') {
                await i.deferUpdate();
                await update(ctx, msg, st);
                return;
            }

            if (id === 'blacklist_prev') {
                await i.deferUpdate();
                if (st.page > 0) st.page--;
                await update(ctx, msg, st);
                return;
            }

            if (id === 'blacklist_next') {
                await i.deferUpdate();
                st.page++;
                await update(ctx, msg, st);
                return;
            }

            if (id === 'settings_guide') {
                await i.deferUpdate();
                st.view = 'GUIDE';
                await update(ctx, msg, st);
                return;
            }
        } catch (e) {
            console.error('Settings collector error:', e);
        }
    });

    col.on('end', () => {
        delete sessions[sessionKey];
    });
}

module.exports = { execute };

/**
 * Project: hana
 * Author: nunu.58 (shutup)
 * Organization: HYZEX Development
 * GitHub: https://github.com/
 * License: Custom
 * © 2026 HYZEX Development. All rights reserved.
 */
