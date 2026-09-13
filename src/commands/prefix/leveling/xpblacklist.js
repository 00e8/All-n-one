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

function resolveTarget(message) {
    const channel = message.mentions.channels?.first();
    if (channel) return { id: channel.id, type: 'channel', display: `${channel}` };
    const role = message.mentions.roles?.first();
    if (role) return { id: role.id, type: 'role', display: `${role}` };
    const user = message.mentions.users?.first();
    if (user) return { id: user.id, type: 'user', display: `<@${user.id}>` };
    return null;
}

module.exports = {
    name: 'xpblacklist',
    aliases: ['xpbl'],
    description: 'Block a channel, role or user from earning XP',
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
            const rows = await lvl.getBlacklist(message.guild.id);
            if (!rows.length) return message.reply(card(`${emojis.info} XP blacklist is empty`));
            const mention = (r) => (r.type === 'channel' ? `<#${r.target_id}>` : r.type === 'role' ? `<@&${r.target_id}>` : `<@${r.target_id}>`);
            const lines = rows.map((r) => `-# ${mention(r)} \u00b7 ${r.type}`).join('\n');
            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('-# XP Blacklist'))
                .addSeparatorComponents(sep())
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines));
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { roles: [], users: [] } });
        }

        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply(card(`${emojis.error} You need the Manage Server permission to use this command`));
        }

        const target = resolveTarget(message);
        if (!target) return message.reply(card('Usage `xpblacklist add #channel|@role|@user` or `xpblacklist remove ...`'));

        if (sub === 'add') {
            await lvl.addBlacklist(message.guild.id, target.id, target.type);
            return message.reply({ ...card(`${emojis.success} ${target.display} can no longer earn XP`), allowedMentions: { roles: [], users: [] } });
        }

        if (sub === 'remove') {
            await lvl.removeBlacklist(message.guild.id, target.id, target.type);
            return message.reply({ ...card(`${emojis.success} ${target.display} can earn XP again`), allowedMentions: { roles: [], users: [] } });
        }

        return message.reply(card('Usage `xpblacklist add #channel|@role|@user` or `xpblacklist remove ...`'));
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