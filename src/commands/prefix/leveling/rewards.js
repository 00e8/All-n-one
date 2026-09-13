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
    name: 'rewards',
    aliases: ['levelrewards'],
    description: 'Manage level-up role rewards',
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
            const rewards = await lvl.listRewards(message.guild.id);
            if (!rewards.length) return message.reply(card(`${emojis.info} No level rewards configured`));

            const lines = rewards.map((r) => `-# Level ${r.level} \u2192 <@&${r.role_id}>`).join('\n');
            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('-# Level Rewards'))
                .addSeparatorComponents(sep())
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines));
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { roles: [] } });
        }

        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply(card(`${emojis.error} You need the Manage Server permission to use this command`));
        }

        if (sub === 'add') {
            const level = parseInt(args[1]);
            const role = message.mentions.roles?.first();
            if (isNaN(level) || !role) return message.reply(card('Usage `rewards add <level> @role`'));
            await lvl.addReward(message.guild.id, level, role.id);
            return message.reply(card(`${emojis.success} Level ${level} now grants ${role}`));
        }

        if (sub === 'remove') {
            const level = parseInt(args[1]);
            const role = message.mentions.roles?.first();
            if (isNaN(level) || !role) return message.reply(card('Usage `rewards remove <level> @role`'));
            await lvl.removeReward(message.guild.id, level, role.id);
            return message.reply(card(`${emojis.success} Removed reward ${role} at level ${level}`));
        }

        return message.reply(card('Usage `rewards list`, `rewards add <level> @role`, `rewards remove <level> @role`'));
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