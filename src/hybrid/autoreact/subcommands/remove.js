// © Author:  
// https://discord.gg/wwv



const { AutoReact } = require('../../../data/models');
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');

module.exports = {
    name: 'remove',
    async execute(interactionOrMessage, args) {
        const isSlash = interactionOrMessage.isCommand && interactionOrMessage.isCommand();
        const word = isSlash ? interactionOrMessage.options.getString('word') : args[0];

        if (!word) {
            const container = new ContainerBuilder() 
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('-# AutoReact · Remove'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('-# Usage `autoreact remove word>`'));
            return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const deleted = await AutoReact.destroy({
            where: {
                guildId: interactionOrMessage.guildId,
                trigger: word.toLowerCase()
            }
        });

        if (!deleted) {
            const container = new ContainerBuilder() 
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('-# AutoReact · Remove'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# No autoreact found for word \`${word}\``));
            return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const container = new ContainerBuilder() 
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('-# AutoReact · Removed'))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# removed autoreact for \`${word}\``));
        return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
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