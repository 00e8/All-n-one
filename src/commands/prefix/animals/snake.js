// © Author:  
// https://discord.gg/wwv

const {
  ContainerBuilder,
  TextDisplayBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags
} = require("discord.js");

const emojis = require('../../../emojis.json');
const { fetchAnimalImage } = require('../../../lib/animalApi');

module.exports = {
  name: "snake",
  description: "Random picture of a snake",
  cooldown: 5,

  async execute(message) {
    try {
      const imageUrl = await fetchAnimalImage('snake');
      if (!imageUrl) return message.reply(`-# ${emojis.error} No image found right now. Try again in a moment.`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# Random Snake`)
        )
        .addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(imageUrl).setDescription("Random snake image")
          )
        );

      await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
      console.error("Error fetching snake image:", error);
      await message.reply(`-# ${emojis.error} Failed to fetch snake image. Please try again later.`);
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