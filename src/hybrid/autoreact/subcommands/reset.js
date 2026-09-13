// © Author:  
// https://discord.gg/wwv



const { AutoReact } = require('../../../data/models');
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');

module.exports = {
    name: 'reset',
    async execute(interactionOrMessage) {
        await AutoReact.destroy({ where: { guildId: interactionOrMessage.guildId } });

        const container = new ContainerBuilder() 
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('-# AutoReact · Reset'))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('-# reset all autoreacts for this server.'));
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