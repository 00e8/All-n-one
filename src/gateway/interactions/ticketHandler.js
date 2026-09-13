// © Author:
// https://discord.gg/wwv

const db = require('../../lib/ticket/db');
const TicketUI = require('../../lib/ticket/ui');
const emoji = require('../../lib/ticket/emoji');
const { checkTicketPermission } = require('../../lib/ticket/permissions');
const { pseudoCtx } = require('../../lib/ticket/context');
const { createTicketChannel, addUserToTicket, removeUserFromTicket, startClosingTicket, CLOSE_DELAY_SECONDS } = require('../../lib/ticket/actions');

async function handle(interaction) {
    const id = interaction.customId;
    if (!id) return false;

    if (interaction.isStringSelectMenu() && id === 'ticket_create') {
        await handleTicketCreate(interaction);
        return true;
    }

    if (interaction.isButton()) {
        if (id.startsWith('ticket_close_')) { await handleTicketClose(interaction); return true; }
        if (id.startsWith('close_confirm_')) { await handleConfirmClose(interaction); return true; }
        if (id === 'close_cancel') { await handleCancelClose(interaction); return true; }
    }

    if (interaction.isUserSelectMenu() && id.startsWith('ticket_add_user_')) {
        await handleAddUser(interaction);
        return true;
    }

    if (interaction.isStringSelectMenu() && id.startsWith('ticket_remove_user_')) {
        await handleRemoveUser(interaction);
        return true;
    }

    return false;
}

async function handleTicketCreate(interaction) {
    await interaction.deferReply({ flags: TicketUI.getEphemeralFlags() });

    const categoryId = interaction.values[0];
    const guild = interaction.guild;
    const user = interaction.user;

    const panels = await db.getGuildPanels(guild.id);
    const panel = panels.find(p => p.categories.some(c => c.categoryId === categoryId));

    if (!panel) {
        return interaction.editReply({ components: [TicketUI.buildError('-# Panel Not Found', '-# The ticket panel could not be located.')], flags: TicketUI.getFlags() });
    }

    const category = panel.categories.find(c => c.categoryId === categoryId);
    if (!category || !category.isActive) {
        return interaction.editReply({ components: [TicketUI.buildWarning('-# Category Unavailable', '-# This ticket category is currently disabled or does not exist.')], flags: TicketUI.getFlags() });
    }

    const isBlacklisted = await db.isUserBlacklisted(guild.id, user.id);
    if (isBlacklisted) {
        return interaction.editReply({ components: [TicketUI.buildError('-# Access Denied', '-# You are blacklisted from creating tickets in this server.')], flags: TicketUI.getFlags() });
    }

    const openTickets = await db.getUserCategoryOpenTickets(guild.id, user.id, categoryId);
    if (openTickets.length >= category.settings.maxTicketsPerUser) {
        const existingTicket = openTickets[0];
        return interaction.editReply({
            components: [TicketUI.buildWarning(
                '-# Maximum Tickets Reached',
                `-# You already have **${category.settings.maxTicketsPerUser}** open ticket(s) in this category.\n-# Your existing ticket: <#${existingTicket.channelId}>`
            )],
            flags: TicketUI.getFlags(),
        });
    }

    try {
        const ticket = await db.createTicket(guild.id, panel.panelId, categoryId, user.id);
        const channel = await createTicketChannel(interaction.client, guild, panel, category, user, ticket);

        const successContainer = TicketUI.buildInfo('', `-# Your ticket has been created\n → ${channel}`);
        await interaction.editReply({ components: [successContainer], flags: TicketUI.getFlags() });
    } catch (error) {
        console.error('Ticket creation error:', error);
        await interaction.editReply({ components: [TicketUI.buildError('-# Error', '-# Failed to create ticket. Contact an administrator.')], flags: TicketUI.getFlags() });
    }
}

async function getTicketFromChannel(interaction) {
    const ticket = await db.getTicketByChannelAny(interaction.channelId);
    if (!ticket) {
        await interaction.reply({ components: [TicketUI.buildError('-# Invalid Channel', '-# This is not a ticket channel.')], flags: TicketUI.getEphemeralFlags() });
        return null;
    }
    return ticket;
}

async function handleAddUser(interaction) {
    await interaction.deferUpdate();

    const ticketId = interaction.customId.replace('ticket_add_user_', '');
    const userId = interaction.values[0];

    const ticket = await db.getTicket(ticketId);
    if (!ticket) {
        return interaction.followUp({ components: [TicketUI.buildError('-# Ticket Not Found', '-# The ticket could not be located.')], flags: TicketUI.getEphemeralFlags() });
    }

    const canAdd = await checkTicketPermission(pseudoCtx(interaction), ticket, 'manage');
    if (!canAdd) {
        return interaction.followUp({ components: [TicketUI.buildError('-# Permission Denied', "-# You don't have permission to add users to this ticket.")], flags: TicketUI.getEphemeralFlags() });
    }

    if (userId === ticket.userId) {
        return interaction.followUp({ components: [TicketUI.buildWarning('-# Invalid User', '-# The ticket creator is already part of this ticket.')], flags: TicketUI.getEphemeralFlags() });
    }

    const addedUsers = await db.getAddedUsers(ticketId);
    if (addedUsers.length >= 5) {
        return interaction.followUp({ components: [TicketUI.buildWarning('-# Maximum Users Reached', '-# A maximum of 5 users can be added to a ticket.')], flags: TicketUI.getEphemeralFlags() });
    }

    const isAlreadyAdded = await db.isUserAdded(ticketId, userId);
    if (isAlreadyAdded) {
        return interaction.followUp({ components: [TicketUI.buildInfo('-# User Already Added', '-# This user already has access to the ticket.')], flags: TicketUI.getEphemeralFlags() });
    }

    const panel = await db.getPanel(ticket.panelId);
    const category = panel?.categories?.find(c => c.categoryId === ticket.categoryId);
    if (!panel || !category) {
        return interaction.followUp({ components: [TicketUI.buildError('-# Configuration Missing', '-# This ticket\u2019s panel or category no longer exists.')], flags: TicketUI.getEphemeralFlags() });
    }

    await addUserToTicket(interaction.client, interaction.guild, interaction.channel, ticket, category, panel, userId, interaction.user.id);
}

async function handleRemoveUser(interaction) {
    await interaction.deferUpdate();

    const ticketId = interaction.customId.replace('ticket_remove_user_', '');
    const userId = interaction.values[0];

    const ticket = await db.getTicket(ticketId);
    if (!ticket) {
        return interaction.followUp({ components: [TicketUI.buildError('-# Ticket Not Found', '-# The ticket could not be located.')], flags: TicketUI.getEphemeralFlags() });
    }

    const canRemove = await checkTicketPermission(pseudoCtx(interaction), ticket, 'manage');
    if (!canRemove) {
        return interaction.followUp({ components: [TicketUI.buildError('-# Permission Denied', "-# You don't have permission to remove users from this ticket.")], flags: TicketUI.getEphemeralFlags() });
    }

    const panel = await db.getPanel(ticket.panelId);
    const category = panel?.categories?.find(c => c.categoryId === ticket.categoryId);
    if (!panel || !category) {
        return interaction.followUp({ components: [TicketUI.buildError('-# Configuration Missing', '-# this ticket\u2019s panel or category no longer exists.')], flags: TicketUI.getEphemeralFlags() });
    }

    await removeUserFromTicket(interaction.client, interaction.guild, interaction.channel, ticket, category, panel, userId, interaction.user.id);
}

async function handleTicketClose(interaction) {
    const ticket = await getTicketFromChannel(interaction);
    if (!ticket) return;

    const canClose = await checkTicketPermission(pseudoCtx(interaction), ticket, 'close');
    if (!canClose) {
        return interaction.reply({ components: [TicketUI.buildError('> - -# Permission Denied', "> - -# You don't have permission to close this ticket.")], flags: TicketUI.getEphemeralFlags() });
    }

    const seconds = CLOSE_DELAY_SECONDS;
    await interaction.reply({
        components: [TicketUI.buildConfirmation(
            `-# Close`,
            `> - -# This will close the ticket and the channel will be **deleted automatically** ${seconds} seconds later.\n> - -# This action cannot be undone`,
            `close_confirm_${ticket.ticketId}`,
            'close_cancel',
            'Confirm'
        )],
        flags: TicketUI.getEphemeralFlags(),
    });
}

async function handleConfirmClose(interaction) {
    const ticketId = interaction.customId.replace('close_confirm_', '');
    const ticket = await db.getTicket(ticketId);
    if (!ticket) {
        return interaction.update({ components: [TicketUI.buildError('-# Ticket Not Found', '-# The ticket could not be located.')], flags: TicketUI.getFlags() });
    }

    const channel = await interaction.guild.channels.fetch(ticket.channelId).catch(() => null);
    const seconds = CLOSE_DELAY_SECONDS;

    await interaction.update({ components: [TicketUI.buildSuccess('> - -# Closing', `> - -# This ticket will close and be deleted in ${seconds} seconds.`)], flags: TicketUI.getFlags() });

    if (channel?.isTextBased()) {
        await startClosingTicket(interaction.client, interaction.guild, channel, ticket, seconds);
    }
}

async function handleCancelClose(interaction) {
    await interaction.update({ components: [TicketUI.buildInfo('-# Action Cancelled', '-# The close request has been cancelled.')], flags: TicketUI.getFlags() });
}

module.exports = { handle };

/**
 * Project: hana
 * Author: nunu.58 (shutup)
 * Organization: HYZEX Development
 * GitHub: https://github.com/
 * License: Custom
 * © 2026 HYZEX Development. All rights reserved.
 */
