// © Author:  
// https://discord.gg/wwv



const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const emojis = require('../../../emojis.json');
const levelingService = require('../../../lib/levelingService');
const lvl = require('../../../data/leveling');

module.exports = {
    name: 'streak',
    aliases: ['daily'],
    description: 'Claim your daily XP streak',
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

        const result = await levelingService.claimStreak(message.author.id, message.guild.id);

        if (!result.success) {
            const nextTs = result.nextAt;
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# ${emojis.error} Already claimed come back <t:${nextTs}:R>`)
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `-# Streak claimed\n> - -# day ${result.current} \n> - -# best ${result.best} \n> - -# ${result.xpGained} XP`
                )
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