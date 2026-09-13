// © Author:  
// https://discord.gg/wwv

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags
} = require('discord.js');
const emojis = require('../../../emojis.json');
const { createPaginationSession } = require('../../../lib/pagination');
const { fetchPfps } = require('../../../lib/pfpApi');

module.exports = {
  name: 'pfp anime',
  aliases: ['pfps anime'],
  description: 'Browse anime profile pictures',
  cooldown: 5,

  async execute(message, args) {
    let pfps;
    try {
      pfps = await fetchPfps('anime');
    } catch {
      pfps = [];
    }

    if (!pfps || pfps.length === 0) {
      const container = new ContainerBuilder() 
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# ${emojis.error} No anime pfps found. Try again later.`)
        );
      return message.channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    const pagination = createPaginationSession({
      interactionOrMessage: message,
      pages: pfps,
      userId: message.author.id,
      renderPage: (pageIndex, imageUrl) => {
        const container = new ContainerBuilder() ;
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# Anime Profile Pictures`)
        );
        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );
        container.addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(imageUrl).setDescription('Anime Profile Picture')
          )
        );
        return container;
      }
    });

    await pagination.renderInitial();
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