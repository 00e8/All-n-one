// © Author:  
// https://discord.gg/wwv



const { ContainerBuilder, TextDisplayBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const lvl = require('../../../data/leveling');

function card(text) {
    return {
        components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${text}`))],
        flags: MessageFlags.IsComponentsV2,
    };
}

module.exports = {
    name: 'leveling',
    aliases: ['lvltoggle'],
    description: 'Enable or disable the leveling  for this server',
    cooldown: 5,

    async execute(message, args) {
        const sub = args[0]?.toLowerCase();

        if (sub === 'status' || !sub) {
            const enabled = await lvl.isSystemEnabled(message.guild.id);
            return message.reply(
                card(`-# Leveling ${enabled ? 'Enabled' : 'Disabled'}`)
            );
        }

        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply(card('You need the permission to use this command'));
        }

        if (sub === 'enable') {
            await lvl.patchGuildSettings(message.guild.id, 'enabled', 1);
            return message.reply(card('-# Leveling enabled'));
        }

        if (sub === 'disable') {
            await lvl.patchGuildSettings(message.guild.id, 'enabled', 0);
            return message.reply(card('Leveling disabled, XP gain has been paused'));
        }

        return message.reply(card('Usage `leveling enable`, `leveling disable` or `leveling status`'));
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