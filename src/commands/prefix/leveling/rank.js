// © Author:  
// https://discord.gg/wwv

const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
    AttachmentBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
} = require('discord.js');
const emojis = require('../../../emojis.json');
const levelingService = require('../../../lib/levelingService');
const lvl = require('../../../data/leveling');
const { renderLevelCard } = require('../../../lib/rankCard');

module.exports = {
    name: 'rank',
    aliases: ['level', 'lvl'],
    description: 'View a member\u2019s level and XP progress',
    cooldown: 5,

    async execute(message, args) {
        const __levelingSystemEnabled = await lvl.isSystemEnabled(message.guild.id);
        if (!__levelingSystemEnabled) {
            const disabledContainer = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# Leveling is currently **disabled** in this server`)
                );
            return message.reply({ components: [disabledContainer], flags: MessageFlags.IsComponentsV2 });
        }

        const target = message.mentions.members?.first() || message.member;
        const profile = await levelingService.getProfile(target.id, message.guild.id);

        if (!profile) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# ${emojis.error} ${target} has no XP yet`)
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const xpInLevel = profile.remainingXp;
        const bar = levelingService.progressBar(xpInLevel, profile.xpForNext, 14);

        let attachment = null;
        try {
            const settings = await lvl.getGuildSettings(message.guild.id);
            const buffer = await renderLevelCard({
                avatarURL: target.displayAvatarURL({ extension: 'png', size: 256 }),
                username: target.user.username,
                level: profile.computedLevel,
                xpInLevel,
                xpForNext: profile.xpForNext,
                backgroundURL: settings?.level_up_background,
                title: 'YOUR RANK',
                formatXP: levelingService.formatXP,
            });
            attachment = new AttachmentBuilder(buffer, { name: 'rankcard.png' });
        } catch (err) {
            console.error(`[Rank] Failed to render rank card: ${err.message}`);
        }

        const container = new ContainerBuilder();

        if (attachment) {
            container.addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(
                    new MediaGalleryItemBuilder().setURL('attachment://rankcard.png')
                )
            );
            container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
        }

        container
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `> - -# <@${target.id}>\n` +
                    `> - -# Rank ${emojis.trophy || ''} ${levelingService.ordinal(profile.rank)}\n` +
                    `> - -# Level ${profile.computedLevel}\n` +
                    `> - -# XP ${levelingService.formatXP(xpInLevel)} / ${levelingService.formatXP(profile.xpForNext)}\n` +
                    `> - -# ${bar}`
                )
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `> - -# Total XP ${levelingService.formatXP(profile.xp)}\n` +
                    `> - -# Messages ${profile.messages}\n` +
                    `> - -# Voice ${levelingService.formatDuration(profile.voice_secs)}`
                )
            );

        const payload = { components: [container], flags: MessageFlags.IsComponentsV2 };
        if (attachment) payload.files = [attachment];

        return message.reply(payload);
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