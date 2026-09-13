// © Author:  
// https://discord.gg/wwv



const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
} = require('discord.js');
const emojis = require('../../../emojis.json');
const lvl = require('../../../data/leveling');
const levelingService = require('../../../lib/levelingService');

const sep = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);

module.exports = {
    name: 'xptop',
    aliases: ['xplb', 'levelboard'],
    description: 'View the server XP leaderboard',
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

        const mode = args[0]?.toLowerCase();

        let rows, title, valueFn;
        if (mode === 'voice') {
            rows = await lvl.topSpeakers(message.guild.id, 10);
            title = 'Voice Leaderboard';
            valueFn = (r) => levelingService.formatDuration(r.voice_secs);
        } else if (mode === 'messages') {
            rows = await lvl.topChatters(message.guild.id, 10);
            title = 'Message Leaderboard';
            valueFn = (r) => `${r.messages} messages`;
        } else {
            rows = await lvl.leaderboard(message.guild.id, 10);
            title = 'XP Leaderboard';
            valueFn = (r) => `${levelingService.formatXP(r.xp)} XP \u00b7 Level ${r.level}`;
        }

        if (!rows.length) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# ${emojis.error} No data yet`)
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const lines = rows.map((r, i) => `-# ${emojis.trophy || ''} ${i + 1}. <@${r.user_id}> \u2014 ${valueFn(r)}`).join('\n');

        const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${title}`))
            .addSeparatorComponents(sep())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines));

        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } });
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