// © Author:  
// https://discord.gg/wwv



const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const lvl = require('../../../data/leveling');
const levelingService = require('../../../lib/levelingService');

const sep = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);

module.exports = {
    name: 'serverstats',
    aliases: ['lvlstats'],
    description: 'View overall leveling activity for this server',
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

        const top = await lvl.leaderboard(message.guild.id, 1);
        const topChatter = await lvl.topChatters(message.guild.id, 1);
        const topSpeaker = await lvl.topSpeakers(message.guild.id, 1);

        const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${message.guild.name} \u2014 Leveling Stats`))
            .addSeparatorComponents(sep())
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `-# Top XP ${top[0] ? `<@${top[0].user_id}> \u2014 ${levelingService.formatXP(top[0].xp)} XP` : 'None yet'}\n` +
                    `-# Most messages ${topChatter[0] ? `<@${topChatter[0].user_id}> \u2014 ${topChatter[0].messages}` : 'None yet'}\n` +
                    `-# Most voice time ${topSpeaker[0] ? `<@${topSpeaker[0].user_id}> \u2014 ${levelingService.formatDuration(topSpeaker[0].voice_secs)}` : 'None yet'}`
                )
            );

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