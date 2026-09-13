// © Author:  
// https://discord.gg/wwv



const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const config = require('../../../config');

module.exports = {
    name: 'ownerhelp',
    description: 'List all owner-only commands',
    cooldown: 5,
    aliases: ['ohelp', 'ownerh'],
    ownerOnly: true,

    async execute(message, args) {
        if (message.author.id !== config.OWNER_ID) return;

        const container = new ContainerBuilder() 
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('-# Owner Commands')
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    '> - -#  adminlock, commandlock, commandunlock, dm, errorlog, eval, guildinvite, guildleave, listservers, noprefix, reboot'
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`-# Admin restricted access | ${config.BOT_NAME}`)
            );

        return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};

/**
 * Project: hana
 * Author: nunu.58 (shutup)
 * Organization: HYZEX Development
 * GitHub: https://github.com/ 
 * License: Custom
 * © 2026 HYZEX Development. All rights reserved.
 */