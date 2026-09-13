// © Author:
// https://discord.gg/wwv
//
// /ticket close — close (and, after a short delay, delete) the
// current ticket channel.

const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const db = require('../../../lib/ticket/db');
const emoji = require('../../../lib/ticket/emoji');
const { checkTicketPermission } = require('../../../lib/ticket/permissions');
const { startClosingTicket, CLOSE_DELAY_SECONDS } = require('../../../lib/ticket/actions');

function box(title, text) {
    return new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${title} ${text}`));
}

async function execute(ctx) {
    const ticket = await db.getTicketByChannel(ctx.channel.id);
    if (!ticket) {
        return ctx.reply({ components: [box(`-# Invalid Channel`, '-# This command can only be used inside a ticket channel.')], flags: MessageFlags.IsComponentsV2 });
    }

    const canClose = await checkTicketPermission(ctx, ticket, 'close');
    if (!canClose) {
        return ctx.reply({ components: [box(`> - -# Permission Denied`, "> - -# You don't have permission to close this ticket.")], flags: MessageFlags.IsComponentsV2 });
    }

    const seconds = CLOSE_DELAY_SECONDS;
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`> - -#  Close\n> - -# this will close the ticket and the channel will be **deleted automatically** ${seconds} seconds later.\n> - -# This action cannot be undone`));
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    container.addActionRowComponents(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`close_confirm_${ticket.ticketId}`).setLabel('Confirm').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('close_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
    ));

    const msg = await ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });

    const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === ctx.author.id, time: 60_000, max: 1 });
    collector.on('collect', async i => {
        if (i.customId === 'close_cancel') {
            await i.update({ components: [box('-# Action Cancelled', '-# The close request has been cancelled.')], flags: MessageFlags.IsComponentsV2 });
            return;
        }

        await i.update({ components: [box(`> - -# Closing`, `> - -# This ticket will close and be deleted in ${seconds} seconds.`)], flags: MessageFlags.IsComponentsV2 });
        await startClosingTicket(ctx.client, ctx.guild, ctx.channel, ticket, seconds);
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
