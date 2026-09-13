// © Author:
// https://discord.gg/wwv
//
// Discord-side effects for the ticket system (creating/closing ticket
// channels, adding/removing members, logging). Shared by the /ticket
// subcommands and the button/select interaction handler so the logic
// only lives in one place.
 
const { ChannelType, PermissionFlagsBits } = require('discord.js');
const db = require('./db');
const TicketUI = require('./ui');
const emoji = require('./emoji');
const { generateTranscript } = require('./transcript');
 
const CLOSE_DELAY_SECONDS = 5;
 
async function createTicketChannel(client, guild, panel, category, user, ticket) {
    // Username only — no "ticket-" prefix, no ticket number.
    const channelName = user.username.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 100);
 
    const permissionOverwrites = [
        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        {
            id: user.id,
            allow: [
                PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks,
            ],
        },
        {
            id: client.user.id,
            allow: [
                PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages,
            ],
        },
    ];
 
    for (const roleId of category.supportRoles || []) {
        const role = await guild.roles.fetch(roleId).catch(() => null);
        if (role) {
            permissionOverwrites.push({
                id: roleId,
                allow: [
                    PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks,
                ],
            });
        }
    }

    const channel = await guild.channels.create({
        name: channelName || `${user.id}`,
        type: ChannelType.GuildText,
        parent: category.ticketChannelCategory || null,
        permissionOverwrites,
        topic: `Ticket #${ticket.ticketId} | User: ${user.tag}`,
    });

    await db.setTicketChannel(ticket.ticketId, channel.id);

    let pingContent = '';
    if (category.settings.pingUser) pingContent += `<@${user.id}> `;
    if (category.settings.pingRole && category.supportRoles?.length > 0) {
        pingContent += category.supportRoles.map(r => `<@&${r}>`).join(' ');
    }
    if (pingContent) await channel.send({ content: pingContent, allowedMentions: { users: [user.id], roles: category.supportRoles || [] } });

    const freshTicket = await db.getTicket(ticket.ticketId);
    const controlMsg = await channel.send({
        components: [TicketUI.buildTicketPanel(freshTicket, category, [])],
        flags: TicketUI.getFlags(),
    });
    await controlMsg.pin().catch(() => {});
    await db.setTicketControlMessage(ticket.ticketId, controlMsg.id);

    if (category.settings.dmUserOnOpen) {
        try {
            await user.send(
                `> - -# Your ticket has been created in **${guild.name}**\n` +
                `> - -# Channel: <#${channel.id}>`
            );
        } catch (_) {}
    }

    if (panel.logs?.createChannel) {
        const logChannel = await guild.channels.fetch(panel.logs.createChannel).catch(() => null);
        if (logChannel?.isTextBased()) {
            await logChannel.send({
                components: [TicketUI.buildLogEmbed('-# Ticket Created', {
                    User: `<@${user.id}>`,
                    Category: category.name,
                    Channel: `<#${channel.id}>`,
                    'ID': channel.id,
                })],
                flags: TicketUI.getFlags(),
                allowedMentions: { parse: [] },
            }).catch(() => {});
        }
    }

    return channel;
}

/** Refreshes the pinned control-panel message with the current added-users list. */
async function refreshControlPanel(client, guild, channel, ticket, category) {
    const controlMsgId = await db.getControlMessage(ticket.ticketId);
    if (!controlMsgId) return;
    const controlMsg = await channel.messages.fetch(controlMsgId).catch(() => null);
    if (!controlMsg) return;

    const addedUsers = await db.getAddedUsers(ticket.ticketId);
    const enrichedUsers = [];
    for (const addedUser of addedUsers) {
        const user = await client.users.fetch(addedUser.userId).catch(() => null);
        const addedByUser = await client.users.fetch(addedUser.addedBy).catch(() => null);
        enrichedUsers.push({
            userId: addedUser.userId,
            username: user?.username || `User ${addedUser.userId}`,
            addedByUsername: addedByUser?.username || 'Unknown',
        });
    }

    await controlMsg.edit({ components: [TicketUI.buildTicketPanel(ticket, category, enrichedUsers)], flags: TicketUI.getFlags() }).catch(() => {});
}

async function addUserToTicket(client, guild, channel, ticket, category, panel, userId, addedById) {
    await channel.permissionOverwrites.edit(userId, {
        ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true, EmbedLinks: true,
    }).catch(() => {});

    await db.addTicketUser(ticket.ticketId, userId, addedById);
    const freshTicket = await db.getTicket(ticket.ticketId);

    await channel.send({
        components: [TicketUI.buildSuccess('-# User Added',
            `> - -# <@${userId}> has been added to this ticket\n` +
            `> - -# Added by <@${addedById}>`
        )],
        flags: TicketUI.getFlags(),
        allowedMentions: { parse: [] },
    }).catch(() => {});

    await refreshControlPanel(client, guild, channel, freshTicket, category);

    if (panel.logs?.userAddChannel) {
        const logChannel = await guild.channels.fetch(panel.logs.userAddChannel).catch(() => null);
        if (logChannel?.isTextBased()) {
            await logChannel.send({
                components: [TicketUI.buildLogEmbed('-# User Added to Ticket', {
                    User: `<@${userId}>`,
                    'Added By': `<@${addedById}>`,
                    Channel: `<#${channel.id}>`,
                    'ID': channel.id,
                })],
                flags: TicketUI.getFlags(),
                allowedMentions: { parse: [] },
            }).catch(() => {});
        }
    }
}

async function removeUserFromTicket(client, guild, channel, ticket, category, panel, userId, removedById) {
    await channel.permissionOverwrites.delete(userId).catch(() => {});
    await db.removeTicketUser(ticket.ticketId, userId, removedById);
    const freshTicket = await db.getTicket(ticket.ticketId);

    await channel.send({
        components: [TicketUI.buildWarning('-# User Removed',
            `- -# <@${userId}> has been removed from this ticket\n` +
            `- -# Removed by <@${removedById}>`
        )],
        flags: TicketUI.getFlags(),
        allowedMentions: { parse: [] },
    }).catch(() => {});

    await refreshControlPanel(client, guild, channel, freshTicket, category);

    if (panel.logs?.userRemoveChannel) {
        const logChannel = await guild.channels.fetch(panel.logs.userRemoveChannel).catch(() => null);
        if (logChannel?.isTextBased()) {
            await logChannel.send({
                components: [TicketUI.buildLogEmbed('-# User Removed from Ticket', {
                    User: `<@${userId}>`,
                    'Removed By': `<@${removedById}>`,
                    Channel: `<#${channel.id}>`,
                    'ID': channel.id,
                })],
                flags: TicketUI.getFlags(),
                allowedMentions: { parse: [] },
            }).catch(() => {});
        }
    }
}

/** Sends the closing countdown, then deletes the ticket row + channel and logs a transcript. */
async function startClosingTicket(client, guild, channel, ticket, seconds = CLOSE_DELAY_SECONDS) {
    await channel.send({ components: [TicketUI.buildClosingNotice(seconds)], flags: TicketUI.getFlags() }).catch(() => {});

    setTimeout(async () => {
        try {
            const panel = await db.getPanel(ticket.panelId);
            const category = panel?.categories?.find(c => c.categoryId === ticket.categoryId);
            const categoryName = category?.name || 'Ticket';

            let transcript = null;
            try {
                transcript = await generateTranscript(ticket, categoryName, guild);
            } catch (_) {}

            const logChannelId = panel?.logs?.closeChannel || panel?.logs?.deleteChannel;
            if (logChannelId) {
                const logChannel = await guild.channels.fetch(logChannelId).catch(() => null);
                if (logChannel?.isTextBased()) {
                    await logChannel.send({
                        components: [TicketUI.buildLogEmbed('-# Ticket Closed', {
                            User: `<@${ticket.userId}>`,
                            Category: categoryName,
                            'ID': channel.id,
                            Timestamp: `<t:${Math.floor(Date.now() / 1000)}:F>`,
                        })],
                        files: transcript ? [transcript] : [],
                        flags: TicketUI.getFlags(),
                        allowedMentions: { parse: [] },
                    }).catch(() => {});
                }
            }

            if (category?.settings?.dmUserOnClose) {
                const ticketCreator = await client.users.fetch(ticket.userId).catch(() => null);
                if (ticketCreator) {
                    await ticketCreator.send({
                        components: [TicketUI.buildInfo('-# Ticket Closed',
                            `- -# Your ticket in **${guild.name}** has been closed.`
                        )],
                        files: transcript ? [transcript] : [],
                        flags: TicketUI.getFlags(),
                    }).catch(() => {});
                }
            }

            await db.deleteTicket(ticket.ticketId);
            await channel.delete().catch(() => {});
        } catch (error) {
            console.error(`Failed to close ticket ${ticket.ticketId}:`, error);
        }
    }, seconds * 1000);
}

module.exports = {
    CLOSE_DELAY_SECONDS,
    createTicketChannel,
    addUserToTicket,
    removeUserFromTicket,
    startClosingTicket,
    refreshControlPanel,
};

/**
 * Project: hana
 * Author: nunu.58 (shutup)
 * Organization: HYZEX Development
 * GitHub: https://github.com/
 * License: Custom
 * © 2026 HYZEX Development. All rights reserved.
 */