// © Author:  
// https://discord.gg/wwv



const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const config = require('../../../config');

module.exports = {
    name: 'dm',
    description: 'Send a DM to a user from the bot',
    cooldown: 5,
    aliases: ['directmessage', 'senddm'],
    ownerOnly: true,

    async execute(message, args) {
        if (message.author.id !== config.OWNER_ID) return;

        if (args.length < 2) {
            const container = new ContainerBuilder() 
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('-# Direct Message')
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `> -# Usage \`${config.PREFIX} dm <@user/ID> message\``
                    )
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# Admin restricted access | ${config.BOT_NAME}`)
                );

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const userArg = args[0];
        const dmMessage = args.slice(1).join(' ');
        let targetUser;

        const mentionMatch = userArg.match(/^<@!?(\d+)>$/);
        const idMatch = userArg.match(/^(\d{17,19})$/);

        try {
            if (mentionMatch) {
                targetUser = await message.client.users.fetch(mentionMatch[1]);
            } else if (idMatch) {
                targetUser = await message.client.users.fetch(idMatch[1]);
            } else {
                const container = new ContainerBuilder() 
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('-# Direct Message')
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('-# Please mention a user or provide a valid user ID.')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`-# Admin restricted access | ${config.BOT_NAME}`)
                    );

                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }
        } catch {
            const container = new ContainerBuilder() 
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('-# Direct Message')
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('-# Could not find that user.')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# Admin restricted access | ${config.BOT_NAME}`)
                );

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        try {
            await targetUser.send(dmMessage);

            const container = new ContainerBuilder() 
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('-# Direct Message')
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `> - -# Sent to ${targetUser.username} (\`${targetUser.id}\`)\n` +
                        `> - -# \`\`\`${dmMessage}\`\`\``
                    )
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# Admin restricted access | ${config.BOT_NAME}`)
                );

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        } catch {
            const container = new ContainerBuilder() 
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('-# Direct Message')
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# Failed to DM ${targetUser.username} — DMs may be disabled.`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# Admin restricted access | ${config.BOT_NAME}`)
                );

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
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