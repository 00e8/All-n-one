// © Author:  
// https://discord.gg/wwv



const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require('discord.js');

module.exports = {
  name: 'nitro',
  description: 'Generate a fake nitro gift link',
  cooldown: 5,
  aliases: [],
  
  async execute(message, args) {
    const container = new ContainerBuilder() 
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('-# Free Nitro Gift')
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("- -# Here's your free nitro gift\n- -# https://discord.gift/pnQQ9KxKuMqT2KNxHuKANhvc")
      );
    message.channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2
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