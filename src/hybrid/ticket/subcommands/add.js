// © Author:
// https://discord.gg/wwv
//
// /ticket add — add a user to the current ticket channel.

const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const db = require('../../../lib/ticket/db');
const emoji = require('../../../lib/ticket/emoji');
const { checkTicketPermission } = require('../../../lib/ticket/permissions');
const { addUserToTicket } = require('../../../lib/ticket/actions');

function box(title, text) {
    return new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${title} ${text}`));
}

async function execute(ctx) {
    const ticket = await db.getTicketByChannel(ctx.channel.id);
    if (!ticket) {
        return ctx.reply({ components: [box(`-# Invalid Channel`, '-# This command can only be used inside a ticket channel.')], flags: MessageFlags.IsComponentsV2 });
    }

    const canManage = await checkTicketPermission(ctx, ticket, 'manage');
    if (!canManage) {
        return ctx.reply({ components: [box(`-# Permission Denied`, "-# You don't have permission to manage this ticket.")], flags: MessageFlags.IsComponentsV2 });
    }

    const targetUser = ctx.isSlash ? ctx.interaction.options.getUser('user') : ctx.message.mentions.users.first();
    if (!targetUser) {
        return ctx.reply({ components: [box(`-# Missing User`, '-# Please mention or select a user to add.')], flags: MessageFlags.IsComponentsV2 });
    }

    if (targetUser.id === ticket.userId) {
        return ctx.reply({ components: [box('-# Already In Ticket', '-# The ticket creator is already part of this ticket.')], flags: MessageFlags.IsComponentsV2 });
    }

    const isAdded = await db.isUserAdded(ticket.ticketId, targetUser.id);
    if (isAdded) {
        return ctx.reply({ components: [box('-# Already Added', '-# This user already has access to the ticket.')], flags: MessageFlags.IsComponentsV2 });
    }

    const addedUsers = await db.getAddedUsers(ticket.ticketId);
    if (addedUsers.length >= 5) {
        return ctx.reply({ components: [box('-# Maximum Users Reached', '-# A maximum of 5 users can be added to a ticket.')], flags: MessageFlags.IsComponentsV2 });
    }

    const panel = await db.getPanel(ticket.panelId);
    const category = panel?.categories?.find(c => c.categoryId === ticket.categoryId);
    if (!panel || !category) {
        return ctx.reply({ components: [box('-# Configuration Missing', "-# This ticket's panel or category no longer exists.")], flags: MessageFlags.IsComponentsV2 });
    }

    await addUserToTicket(ctx.client, ctx.guild, ctx.channel, ticket, category, panel, targetUser.id, ctx.author.id);
    return ctx.reply({ components: [box(`-# User Added`, `-# <@${targetUser.id}> has been added to the ticket.`)], flags: MessageFlags.IsComponentsV2 });
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
