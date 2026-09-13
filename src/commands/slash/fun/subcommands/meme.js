// © Author:  
// https://discord.gg/wwv



const {
  ContainerBuilder,
  TextDisplayBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  MessageFlags,
} = require('discord.js');

module.exports = {
  name: 'meme',
  description: 'Send A Meme!',
  
  async execute(interaction) {
    await interaction.deferReply();

    try {
      const res = await fetch('https://meme-api.com/gimme');
      const data = await res.json();

      if (!data || !data.url) {
        const container = new ContainerBuilder() 
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# No Memes Found`)
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# Couldn't fetch a meme right now. Your life is the meme`)
          );
        return await interaction.editReply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const container = new ContainerBuilder() 
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# Reddit Meme`)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# ${data.title}\nby u/${data.author} in r/${data.subreddit}`)
        )
        .addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder()
              .setURL(data.url)
              .setDescription(data.title)
          )
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# ${data.ups || 0} upvotes`)
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setLabel("View on Reddit")
              .setStyle(ButtonStyle.Link)
              .setURL(data.postLink)
          )
        );

      return await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      const container = new ContainerBuilder() 
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# Meme API Error`)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Failed to fetch a meme. Please try again later.')
        );
      await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
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