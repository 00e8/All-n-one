// © Author:  
// https://discord.gg/wwv



const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, PermissionFlagsBits } = require('discord.js');
const emojis = require('../../../emojis.json');
const lvl = require('../../../data/leveling');

const sep = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);

function card(text) {
    return {
        components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${text}`))],
        flags: MessageFlags.IsComponentsV2,
    };
}

module.exports = {
    name: 'multiplier',
    aliases: ['xpmultiplier'],
    description: 'Set an XP multiplier for a channel or role',
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

        const sub = args[0]?.toLowerCase();

        if (sub === 'list' || !sub) {
            const mults = await lvl.getMultipliers(message.guild.id);
            if (!mults.length) return message.reply(card(`${emojis.info} No multipliers configured`));
            const lines = mults.map((m) => `-# ${m.type === 'channel' ? `<#${m.target_id}>` : `<@&${m.target_id}>`} \u00d7${m.multiplier}`).join('\n');
            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('-# XP Multipliers'))
                .addSeparatorComponents(sep())
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines));
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { roles: [] } });
        }

        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply(card(`${emojis.error} You need the Manage Server permission to use this command`));
        }

        const channel = message.mentions.channels?.first();
        const role = message.mentions.roles?.first();
        const value = parseFloat(args[args.length - 1]);

        if ((!channel && !role) || isNaN(value)) {
            return message.reply(card('Usage `multiplier #channel <value>` or `multiplier @role <value>`, `0` to remove'));
        }

        const type = channel ? 'channel' : 'role';
        const targetId = channel ? channel.id : role.id;

        if (value <= 0) {
            await lvl.removeMultiplier(message.guild.id, targetId, type);
            return message.reply(card(`${emojis.success} Multiplier removed for ${channel ?? role}`));
        }

        await lvl.setMultiplier(message.guild.id, targetId, type, value);
        return message.reply(card(`${emojis.success} Multiplier for ${channel ?? role} set to \u00d7${value}`));
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