// © Author:  
// https://discord.gg/wwv

const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('banner')
    .setDescription('Get the banner of a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to get the banner from')
        .setRequired(false)
    ),
  
  cooldown: 5,

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = interaction.guild ? await interaction.guild.members.fetch(user.id).catch(() => null) : null;

    const fetchedUser = await interaction.client.users.fetch(user.id, { force: true }).catch(() => null);
    if (!fetchedUser) {
      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# Failed to fetch user data.`)
        );
      return await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const globalBanner = fetchedUser.bannerURL({ extension: 'png', size: 4096 });
    const guildBanner = member?.banner 
      ? member.bannerURL({ extension: 'png', size: 4096 }) 
      : null;

    if (!globalBanner && !guildBanner) {
      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# ${user.displayName} doesn't have a banner set.`)
        );

      return await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const buildContainer = (imageUrl, isGuild = false) => {
      const container = new ContainerBuilder();

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`-# ${user.displayName}'s Banner`)
      );
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );

      const mediaGallery = new MediaGalleryBuilder()
        .addItems(
          new MediaGalleryItemBuilder()
            .setURL(imageUrl)
            .setDescription(`${user.displayName}'s Banner`)
        );

      container.addMediaGalleryComponents(mediaGallery);

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );

      const buttonRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('banner_global')
            .setLabel('A')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(!isGuild ? true : false),
          new ButtonBuilder()
            .setCustomId('banner_guild')
            .setLabel('S')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(isGuild ? true : !guildBanner)
        );

      container.addActionRowComponents(buttonRow);
      return container;
    };

    const initialBanner = globalBanner || guildBanner;
    const initialIsGuild = !globalBanner && !!guildBanner;

    const msg = await interaction.reply({
      components: [buildContainer(initialBanner, initialIsGuild)],
      flags: MessageFlags.IsComponentsV2,
      fetchReply: true
    });

    const collector = msg.createMessageComponentCollector({
      filter: i => i.user.id === interaction.user.id,
      time: 60000
    });

    collector.on('collect', async i => {
      if (i.customId === 'banner_global' && globalBanner) {
        await i.update({
          components: [buildContainer(globalBanner, false)],
          flags: MessageFlags.IsComponentsV2
        });
      }

      if (i.customId === 'banner_guild' && guildBanner) {
        await i.update({
          components: [buildContainer(guildBanner, true)],
          flags: MessageFlags.IsComponentsV2
        });
      }
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