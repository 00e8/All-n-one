// © Author:  
// https://discord.gg/wwv



const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const emojis = require('../../../emojis.json');
const levelingService = require('../../../lib/levelingService');
const lvl = require('../../../data/leveling');

module.exports = {
    name: 'claimreward',
    aliases: ['claimrewards'],
    description: 'Claim any level-up role rewards you\u2019re eligible for',
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

        const heldRoleIds = message.member.roles.cache.map((r) => r.id);
        const status = await levelingService.getRewardStatus(message.author.id, message.guild.id, heldRoleIds);

        if (!status.claimableRewards.length) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# ${emojis.info} No unclaimed rewards right now`)
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const granted = [];
        for (const reward of status.claimableRewards) {
            const role = message.guild.roles.cache.get(reward.role_id);
            if (!role) continue;
            await message.member.roles.add(role).catch(() => {});
            granted.push(role);
        }

        await levelingService.markRewardsClaimed(message.author.id, message.guild.id, status.claimableRewards);

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    granted.length
                        ? `-# ${emojis.success} Claimed ${granted.map((r) => `<@&${r.id}>`).join(', ')}`
                        : `-# ${emojis.error} Could not claim any roles, they may no longer exist`
                )
            );
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { roles: [] } });
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