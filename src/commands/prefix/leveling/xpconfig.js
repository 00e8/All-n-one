// © Author:  
// https://discord.gg/wwv



const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, PermissionFlagsBits } = require('discord.js');
const emojis = require('../../../emojis.json');
const lvl = require('../../../data/leveling');

const sep = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);

function errCard(text) {
    return {
        components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${text}`))],
        flags: MessageFlags.IsComponentsV2,
    };
}

module.exports = {
    name: 'xpconfig',
    aliases: ['lvlconfig'],
    description: 'Configure the leveling system for this server',
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
            return message.reply(errCard(`${emojis.error} You need the Manage Server permission to use this command`));
        }

        const sub = args[0]?.toLowerCase();

        if (!sub || sub === 'view') {
            const s = await lvl.getGuildSettings(message.guild.id);
            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('-# Leveling Configuration'))
                .addSeparatorComponents(sep())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `-# Level up messages ${s.level_up_enabled ? emojis.enabled : emojis.disabled}\n` +
                        `-# Level up channel ${s.level_up_channel ? `<#${s.level_up_channel}>` : 'Same channel'}\n` +
                        `-# Level up DM ${s.level_up_dm ? emojis.enabled : emojis.disabled}\n` +
                        `-# Stack rewards ${s.stack_rewards ? emojis.enabled : emojis.disabled}\n` +
                        `-# XP range ${s.xp_min}-${s.xp_max} per message\n` +
                        `-# XP cooldown ${s.xp_cooldown_secs}s\n` +
                        `-# Voice XP ${s.voice_xp_enabled ? emojis.enabled : emojis.disabled} \u00b7 ${s.voice_xp_per_min}/min`
                    )
                )
                .addSeparatorComponents(sep())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `-# xpconfig channel #channel\n` +
                        `-# xpconfig toggle on|off\n` +
                        `-# xpconfig dm on|off\n` +
                        `-# xpconfig stack on|off\n` +
                        `-# xpconfig message <text>`
                    )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (sub === 'channel') {
            const channel = message.mentions.channels?.first();
            if (!channel) return message.reply(errCard('Usage `xpconfig channel #channel`'));
            await lvl.patchGuildSettings(message.guild.id, 'level_up_channel', channel.id);
            return message.reply(errCard(`${emojis.success} Level up channel set to ${channel}`));
        }

        if (sub === 'toggle') {
            const on = args[1]?.toLowerCase() === 'on';
            await lvl.patchGuildSettings(message.guild.id, 'level_up_enabled', on ? 1 : 0);
            return message.reply(errCard(`${emojis.success} Level up messages ${on ? 'enabled' : 'disabled'}`));
        }

        if (sub === 'dm') {
            const on = args[1]?.toLowerCase() === 'on';
            await lvl.patchGuildSettings(message.guild.id, 'level_up_dm', on ? 1 : 0);
            return message.reply(errCard(`${emojis.success} Level up DM ${on ? 'enabled' : 'disabled'}`));
        }

        if (sub === 'stack') {
            const on = args[1]?.toLowerCase() === 'on';
            await lvl.patchGuildSettings(message.guild.id, 'stack_rewards', on ? 1 : 0);
            return message.reply(errCard(`${emojis.success} Reward stacking ${on ? 'enabled' : 'disabled'}`));
        }

        if (sub === 'message') {
            const text = args.slice(1).join(' ');
            if (!text) return message.reply(errCard('Usage `xpconfig message {mention} leveled up to level {level}`'));
            await lvl.patchGuildSettings(message.guild.id, 'level_up_message', text);
            return message.reply(errCard(`${emojis.success} Level up message updated`));
        }

        return message.reply(errCard('Unknown option, use `xpconfig` to see the list'));
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