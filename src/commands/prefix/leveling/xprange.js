// © Author:  
// https://discord.gg/wwv



const { ContainerBuilder, TextDisplayBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const emojis = require('../../../emojis.json');
const lvl = require('../../../data/leveling');

module.exports = {
    name: 'xprange',
    aliases: [],
    description: 'Set the min/max XP awarded per message',
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

        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# ${emojis.error} You need the Manage Server permission to use this command`)
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const min = parseInt(args[0]);
        const max = parseInt(args[1]);

        if (isNaN(min) || isNaN(max) || min < 0 || max < min) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# Usage \`xprange <min> <max>\``)
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        await lvl.patchGuildSettings(message.guild.id, 'xp_min', min);
        await lvl.patchGuildSettings(message.guild.id, 'xp_max', max);

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`-# ${emojis.success} XP per message set to ${min}-${max}`)
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