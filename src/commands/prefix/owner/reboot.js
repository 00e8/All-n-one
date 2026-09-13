// © Author:  
// https://discord.gg/wwv



const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const config = require('../../../config');

module.exports = {
    name: 'reboot',
    description: 'Reboot the bot and reload all commands',
    cooldown: 5,
    aliases: ['restart', 'reload'],
    ownerOnly: true,

    async execute(message, args) {
        if (message.author.id !== config.OWNER_ID) return;

        const loadingContainer = new ContainerBuilder() 
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('-# Reboot')
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('-# Reloading all commands...')
            );

        const sent = await message.reply({
            components: [loadingContainer],
            flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2,
            fetchReply: true
        });

        try {
            const result = await message.client.reloadAllCommands();

            const container = new ContainerBuilder() 
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('-# Reboot')
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        result.success
                            ? `> - -# ${result.message}`
                            : `> - -# Failed — ${result.message}`
                    )
                );

            if (!result.success && result.error) {
                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`\`\`\`${result.error.substring(0, 500)}\`\`\``)
                );
            }

            container
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# Admin restricted access | ${config.BOT_NAME}`)
                );

            await sent.edit({
                content: null,
                components: [container],
                flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
            });
        } catch (error) {
            await sent.edit({
                content: `-# Error ${error.message}`,
                components: []
            });
        }
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