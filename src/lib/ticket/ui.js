// © Author:
// https://discord.gg/wwv
//
// Shared Components V2 builders for the ticket system's messages
// (panels, control panel, confirmations, log entries, etc).

const {
    ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize,
    ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder,
    UserSelectMenuBuilder, MessageFlags
} = require('discord.js');
const emoji = require('./emoji');

class TicketUI {
    /**
     * Renders the ticket control panel sent inside a ticket channel.
     * Tickets don't have a persisted "closed but not deleted" state —
     * closing warns for a few seconds and then deletes the channel, so
     * this only ever needs the "open" layout.
     */
    static buildTicketPanel(ticket, category, addedUsers = []) {
        const container = new ContainerBuilder();
        const welcomeMsg = category.settings?.welcomeMessage || 'Welcome Support will be with you shortly.';

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`> - -# ${category.name}\n> - -# ${welcomeMsg}`)
        );
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

        container.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new UserSelectMenuBuilder()
                    .setCustomId(`ticket_add_user_${ticket.ticketId}`)
                    .setPlaceholder('Add user to ticket...')
                    .setMaxValues(1)
            )
        );

        if (addedUsers.length > 0) {
            const removeOptions = addedUsers.map(u => ({
                label: u.username || `User ${u.userId}`,
                value: u.userId,
                description: `-# Added by ${u.addedByUsername || 'Unknown'}`,
            }));

            container.addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId(`ticket_remove_user_${ticket.ticketId}`)
                        .setPlaceholder('Remove user from ticket...')
                        .addOptions(removeOptions)
                        .setMaxValues(1)
                )
            );
        }

        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

        container.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`ticket_close_${ticket.ticketId}`).setLabel('Close').setStyle(ButtonStyle.Secondary)
            )
        );

        return container;
    }

    static buildError(title, message) {
        return new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`${title}\n${message}`)
        );
    }

    static buildSuccess(title, message) {
        return new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`${title}\n${message}`)
        );
    }

    static buildWarning(title, message) {
        return new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`${title}\n${message}`)
        );
    }

    static buildInfo(title, message) {
        return new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`${title}\n${message}`)
        );
    }

    /** The "ticket closing" countdown notice, shown right before the channel gets deleted. */
    static buildClosingNotice(seconds) {
        return new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`> - -# will close in ${seconds} seconds\n> - -# This channel will be deleted automatically`)
        );
    }

    static buildConfirmation(title, message, confirmId, cancelId, confirmLabel = 'Confirm', confirmStyle = ButtonStyle.Danger) {
        const container = new ContainerBuilder();
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${title}\n\n${message}`));
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
        container.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(confirmId).setLabel(confirmLabel).setStyle(confirmStyle),
                new ButtonBuilder().setCustomId(cancelId).setLabel('Cancel').setStyle(ButtonStyle.Secondary)
            )
        );
        return container;
    }

    /**
     * Renders each field on its own line: "**Key:** value".
     * Callers pass plain values (no leading "-#" / newlines needed) —
     * this is the single place that owns the log-entry layout.
     */
    static buildLogEmbed(title, data) {
        let content = `## ${title}\n\n`;
        const lines = [];
        for (const [key, value] of Object.entries(data)) {
            if (value !== null && value !== undefined) lines.push(`> - -# ${key}: ${value}`);
        }
        content += lines.join('\n');
        return new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
    }

    static getFlags() {
        return MessageFlags.IsComponentsV2;
    }

    static getEphemeralFlags() {
        return MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral;
    }
}

module.exports = TicketUI;

/**
 * Project: hana
 * Author: nunu.58 (shutup)
 * Organization: HYZEX Development
 * GitHub: https://github.com/
 * License: Custom
 * © 2026 HYZEX Development. All rights reserved.
 */