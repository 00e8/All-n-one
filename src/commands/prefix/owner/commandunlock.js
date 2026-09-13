// © Author:  
// https://discord.gg/wwv

const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const config = require('../../../config');
const commandLockDb = require('../../../data/commandLock');

module.exports = {
    name: 'commandunlock',
    description: 'Unlock a specific command for normal users',
    cooldown: 5,
    aliases: ['cmdunlock', 'unlockcommand', 'unlockcmd'],
    ownerOnly: true,

    async execute(message, args) {
        if (message.author.id !== config.OWNER_ID) return;

        if (!args.length) {
            const lockedCommands = await commandLockDb.getAllLocked();

            const container = new ContainerBuilder() 
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('-# Command Unlock')
                );

            if (lockedCommands.length === 0) {
                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        '> - -# No commands are currently locked.\n' +
                        `> - -# Usage \`${config.PREFIX} commandunlock command\``
                    )
                );
            } else {
                const list = lockedCommands.map((cmd) =>
                    `- **${cmd.command_name}** — locked <t:${Math.floor(cmd.locked_at / 1000)}:R>`
                ).join('\n');
                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# Locked (${lockedCommands.length})\n${list}`)
                );
            }

            container
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# Admin restricted access | ${config.BOT_NAME}`)
                );

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const inputName = args[0].toLowerCase();
        
        const slashCommand = message.client.commands.get(inputName) || 
            message.client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(inputName));
        const prefixCommand = message.client.prefixCommands.get(inputName) || 
            message.client.prefixCommands.find(cmd => cmd.aliases && cmd.aliases.includes(inputName));

        const actualName = slashCommand ? (slashCommand.data ? slashCommand.data.name : slashCommand.name) : (prefixCommand ? prefixCommand.name : inputName);

        if (!(await commandLockDb.isLocked(actualName))) {
            const container = new ContainerBuilder() 
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('-# Command Unlock')
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# ${inputName} is not locked.`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# Admin restricted access | ${config.BOT_NAME}`)
                );

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        await commandLockDb.unlock(actualName);

        const container = new ContainerBuilder() 
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('-# Command Unlock')
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`-# ${actualName} has been unlocked.`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`-# Admin restricted access | ${config.BOT_NAME}`)
            );

        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
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