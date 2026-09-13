// © Author: 
// https://discord.gg/wwv

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { snipeData } = require('../../slash/general/general');

module.exports = {
  name: 'snipe',
  aliases: ['s'],
  description: 'View the last deleted message in the channel',
  cooldown: 5,
  usage: 'snipe',
  category: 'general',
  
  async execute(message, args) {
    const channelSnipes = snipeData.get(message.channel.id) || [];

    if (channelSnipes.length === 0) {
      const container = new ContainerBuilder() 
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# Message Snipe`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# No recently deleted messages found in this channel.`)
        );

      return await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const container = new ContainerBuilder();

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# Snipe messages`)
    );

    for (let i = 0; i < channelSnipes.length; i++) {
      const snipe = channelSnipes[i];

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );

      const content = snipe.content || 'No text content';
      
      let snipeText = `> -# Author <@${snipe.author_id}>\n> -# Sent at <t:${snipe.deleted_at}:F>\n> -# __Message Content__\n> \`\`\`${content}\`\`\``;

      if (snipe.attachments && snipe.attachments.length > 0) {
        const attachmentLinks = snipe.attachments.map(att => `[${att.name}](${att.url})`).join('\n');
        snipeText += `\n> -# Attachments\n-# ${attachmentLinks}`;
      }

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(snipeText)
      );
    }

    return await message.reply({
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