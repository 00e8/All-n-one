// © Author:  
// https://discord.gg/wwv



const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const emojis = require('../../../emojis.json');

module.exports = {
  name: 'hexdec',
  description: 'Convert hexadecimal to decimal',
  cooldown: 5,
  
  async execute(message, args) {
    if (!args || args.length === 0) {
      const container = new ContainerBuilder() 
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# ${emojis.error} Please provide hexadecimal value\nUsage \`hexdec <hex>\``)
        );
      return message.reply({ 
        components: [container], 
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
      });
    }

    let hex = args[0].trim();
    hex = hex.replace(/^0x/i, '');
    
    if (!/^[0-9A-Fa-f]+$/.test(hex)) {
      const container = new ContainerBuilder() 
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# ${emojis.error} Invalid hexadecimal value Use only 0-9 and A-F.`)
        );
      return message.reply({ 
        components: [container], 
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
      });
    }

    const decimal = parseInt(hex, 16);
    
    const container = new ContainerBuilder() 
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`-# Hexadecimal to Decimal`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `-# ${emojis.arrow} 0x${hex.toUpperCase()} = ${decimal}`
        )
      );

    return message.reply({
      components: [container],
      flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
    });
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