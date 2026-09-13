// © Author: 
// https://discord.gg/wwv



const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { editSnipeData } = require('../../slash/general/general');

module.exports = {
  name: 'editsnipe',
  description: 'View the last edited message in the channel',
  cooldown: 5,
  usage: 'editsnipe',
  category: 'general',

  async execute(message, args) {
    const channelEditSnipes = editSnipeData.get(message.channel.id) || [];

    if (channelEditSnipes.length === 0) {
      const container = new ContainerBuilder() 
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# Message Edit Snipe`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# No recently edited messages found in this channel.`)
        );

      return await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const container = new ContainerBuilder() ;

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# Message Snipe`)
    );

    for (let i = 0; i < channelEditSnipes.length; i++) {
      const editSnipe = channelEditSnipes[i];

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );

      const contentBefore = editSnipe.content_before || 'No text content';

      let editSnipeText = `> -# Author <@${editSnipe.author_id}>\n> -# Edited at <t:${editSnipe.edited_at}:F>\n> -# __Message Content__\n> \`\`\`${contentBefore}\`\`\``;

      if (editSnipe.attachments_before && editSnipe.attachments_before.length > 0) {
        const attachmentLinks = editSnipe.attachments_before.map(att => `[${att.name}](${att.url})`).join('\n');
        editSnipeText += `\n> -# Attachments\n-# ${attachmentLinks}`;
      }

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(editSnipeText)
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