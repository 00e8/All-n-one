// © Author:  
// https://discord.gg/wwv



const { ContainerBuilder, TextDisplayBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const emojis = require('../../../emojis.json');
const levelingService = require('../../../lib/levelingService');
const { sendLevelUp } = require('../../../lib/levelingRuntime');
const lvl = require('../../../data/leveling');

module.exports = {
    name: 'givexp',
    aliases: ['addxp'],
    description: 'Give or remove XP from a member',
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

        const target = message.mentions.members?.first();
        const amount = parseInt(args[1]);

        if (!target || isNaN(amount)) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# Usage \`givexp @user <amount>\``)
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const result = await levelingService.giveXP(target.id, message.guild.id, amount);

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `-# ${emojis.success} ${amount >= 0 ? 'Gave' : 'Removed'} ${Math.abs(amount)} XP ${amount >= 0 ? 'to' : 'from'} ${target} \u2014 now level ${result.level}`
                )
            );
        await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } });

        if (result.level > result.oldLevel) {
            await sendLevelUp(message.client, message.channel, target.user, message.guild.id, result.level).catch(() => {});
        }
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