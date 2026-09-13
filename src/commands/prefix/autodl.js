// © Author:  
// https://discord.gg/wwv



const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
    PermissionFlagsBits,
} = require('discord.js');
const emojis = require('../../emojis.json');
const socialDownloader = require('../../data/socialDownloader');

const sep = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);

module.exports = {
    name: 'autodl',
    aliases: ['mediadl', 'sdl'],
    description: 'Enable or disable automatic TikTok/Instagram/Twitter/Reddit link downloading',
    cooldown: 5,

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# ${emojis.error} You need the Manage Server permission to use this command`)
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const sub = args[0]?.toLowerCase();
        const guildId = message.guild.id;

        if (!sub) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('-# Auto Downloader')
                )
                .addSeparatorComponents(sep())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `-# autodl enable — Enable auto downloader\n` +
                        `-# autodl disable — Disable auto downloader\n` +
                        `-# autodl status — View current status`
                    )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (sub === 'status') {
            const enabled = await socialDownloader.isEnabled(guildId);
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# ${message.guild.name} — Auto Downloader Status`)
                )
                .addSeparatorComponents(sep())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `-# Status ${enabled ? `${emojis.enabled} Active` : `${emojis.disabled} Inactive`}`
                    )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (sub === 'enable') {
            const alreadyEnabled = await socialDownloader.isEnabled(guildId);
            if (alreadyEnabled) {
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`-# ${emojis.enabled} Auto Downloader is already enabled`)
                    );
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            await socialDownloader.setEnabled(guildId, true);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# ${emojis.enabled} Auto Downloader has been enabled`)
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (sub === 'disable') {
            const alreadyEnabled = await socialDownloader.isEnabled(guildId);
            if (!alreadyEnabled) {
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`-# ${emojis.disabled} Auto Downloader is already disabled`)
                    );
                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            await socialDownloader.setEnabled(guildId, false);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# ${emojis.disabled} Auto Downloader has been disabled`)
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`-# Invalid option. Use \`autodl enable\`, \`autodl disable\` or \`autodl status\``)
            );
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    },
};

/**
 * Project: hana
 * Author: nunu.58 (shutup)
 * Organization: HYZEX Development
 * GitHub: https://github.com/ 
 * License: Custom
 * © 2026 HYZEX Development. All rights reserved.
 */
