// © Author:
// https://discord.gg/wwv

const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    ComponentType,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');
const config = require('../../../config');
const emojis = require('../../../emojis.json');

function reply(ctx, text) {
    const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    return ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
}

module.exports = {
    name: 'nuke',
    aliases: ['rebuild'],
    description: 'Clones and deletes the channel',
    category: 'Owner',
    usage: 'nuke [#channel]',
    example: 'nuke #general',
    cooldown: 5,
    ownerOnly: true, 

    async execute(message, args) {
        if (message.author.id !== config.OWNER_ID) return;

        let channel = message.channel;
        if (args.length > 0) {
            const channelId = args[0].replace(/[<#>]/g, '');
            const resolved = message.guild.channels.cache.get(channelId);
            if (!resolved) {
                return reply(message, `-# ${emojis.warning} Channel not found.`);
            }
            channel = resolved;
        }

        return module.exports.confirmNuke(message, channel);
    },

    async confirmNuke(message, channel) {
        if (channel.type !== ChannelType.GuildText) {
            return reply(message, `-# ${emojis.warning} I can only nuke text channels.`);
        }

        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return reply(message, `-# ${emojis.warning} I don't have permissions.`);
        }

        const confirmDisplay = new TextDisplayBuilder()
            .setContent(`> - -# Are you sure you want to nuke ${channel} ?\n> - -# This cannot be undone.`);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('confirm_nuke')
                .setLabel('Confirm')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('cancel_nuke')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
        );

        const container = new ContainerBuilder()
            .addTextDisplayComponents(confirmDisplay)
            .addSeparatorComponents(new SeparatorBuilder())
            .addActionRowComponents(row);

        const msg = await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });

        const collector = msg.createMessageComponentCollector({
            filter: i => i.user.id === config.OWNER_ID,
            time: 20000,
            max: 1,
            componentType: ComponentType.Button
        });

        collector.on('collect', async (confirmation) => {
            if (confirmation.customId === 'confirm_nuke') {
                const loadingDisplay = new TextDisplayBuilder().setContent(`-# Executing nuke.`);
                await confirmation.update({
                    components: [new ContainerBuilder().addTextDisplayComponents(loadingDisplay)],
                    flags: MessageFlags.IsComponentsV2
                });
                return module.exports.performNuke(message, channel, confirmation);
            } else {
                const cancelDisplay = new TextDisplayBuilder().setContent(`-# Nuke cancelled.`);
                await confirmation.update({
                    components: [new ContainerBuilder().addTextDisplayComponents(cancelDisplay)],
                    flags: MessageFlags.IsComponentsV2
                });
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
                const timeoutDisplay = new TextDisplayBuilder().setContent(`-# Nuke confirmation timed out.`);
                await msg.edit({
                    components: [new ContainerBuilder().addTextDisplayComponents(timeoutDisplay)],
                    flags: MessageFlags.IsComponentsV2
                }).catch(() => {});
            }
        });
    },

    async performNuke(message, channel, interaction) {
        try {
            const position = channel.position;
            const parentId = channel.parentId;
            const permissionOverwrites = channel.permissionOverwrites.cache;

            const newChannel = await channel.clone({
                name: channel.name,
                type: channel.type,
                topic: channel.topic,
                nsfw: channel.nsfw,
                bitrate: channel.bitrate,
                userLimit: channel.userLimit,
                rateLimitPerUser: channel.rateLimitPerUser,
                parent: parentId,
                permissionOverwrites: permissionOverwrites,
                position: position
            });

            await channel.delete();

            if (newChannel.position !== position) {
                await newChannel.setPosition(position).catch(() => {});
            }

            const successDisplay = new TextDisplayBuilder()
                .setContent(`> - -# ${newChannel} has been nuked`);
            const successContainer = new ContainerBuilder()
                .addTextDisplayComponents(successDisplay);

            await newChannel.send({
                components: [successContainer],
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error('Nuke error:', error);
            const errorDisplay = new TextDisplayBuilder()
                .setContent(`-# ${emojis.warning} Failed to nuke the channel: \`${error.message}\``);
            const errContainer = new ContainerBuilder().addTextDisplayComponents(errorDisplay);

            if (interaction && (interaction.replied || interaction.deferred)) {
                return interaction.followUp({ components: [errContainer], flags: MessageFlags.IsComponentsV2 });
            }
            return message.channel.send({ components: [errContainer], flags: MessageFlags.IsComponentsV2 });
        }
    }
};

/**
 * Project: hana
 * Author: nunu.58 (shutup)
 * Organization: HYZEX Development
 * © 2026 HYZEX Development. All rights reserved.
 */