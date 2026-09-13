// © Author:
// https://discord.gg/wwv
//
// Shared ticket-action permission check, used by both the /ticket
// subcommands and the button/select interaction handler so the rule
// only lives in one place.

const { PermissionFlagsBits } = require('discord.js');
const db = require('./db');

/**
 * @param {object} ctx - object with .guild / .member / .author (a full
 *   CommandContext works, and so does the lightweight pseudo-ctx built
 *   from a raw interaction)
 * @param {object} ticket - ticket row
 * @param {"close"|"manage"} action - "close" additionally allows the
 *   ticket owner through if the category permits user-closing.
 */
async function checkTicketPermission(ctx, ticket, action = 'manage') {
    const panel = await db.getPanel(ticket.panelId);
    if (!panel) return false;

    const category = panel.categories.find(c => c.categoryId === ticket.categoryId);
    if (!category) return false;

    const staffRoles = await db.getStaffRoles(ctx.guild.id);
    const hasStaffRole = ctx.member.roles.cache.some(r => staffRoles.includes(r.id));
    const hasSupportRole = ctx.member.roles.cache.some(r => category.supportRoles.includes(r.id));
    const hasManageChannels = ctx.member.permissions.has(PermissionFlagsBits.ManageChannels);

    if (action === 'close') {
        const isTicketOwner = ctx.author.id === ticket.userId;
        return hasManageChannels || hasStaffRole || hasSupportRole || (category.settings.userCanClose && isTicketOwner);
    }

    return hasManageChannels || hasStaffRole || hasSupportRole;
}

module.exports = { checkTicketPermission };

/**
 * Project: hana
 * Author: nunu.58 (shutup)
 * Organization: HYZEX Development
 * GitHub: https://github.com/
 * License: Custom
 * © 2026 HYZEX Development. All rights reserved.
 */
