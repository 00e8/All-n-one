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
    .setName('avatar')
    .setDescription('Get the avatar of a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to get the avatar from')
        .setRequired(false)
    ),
  
  cooldown: 5,

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = interaction.guild ? await interaction.guild.members.fetch(user.id).catch(() => null) : null;

    const avatarOptions = (hash) => ({
      extension: hash?.startsWith('a_') ? 'gif' : 'png',
      forceStatic: false,
      size: 4096
    });

    const globalAvatar = user.displayAvatarURL(avatarOptions(user.avatar));
    const guildAvatar = member?.avatar
      ? member.displayAvatarURL(avatarOptions(member.avatar))
      : null;

    const buildContainer = (imageUrl, isGuild = false) => {
      const container = new ContainerBuilder();

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`-# ${user.displayName}'s Avatar`)
      );
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );

      const mediaGallery = new MediaGalleryBuilder()
        .addItems(
          new MediaGalleryItemBuilder()
            .setURL(imageUrl)
            .setDescription(`${user.displayName}'s Avatar`)
        );

      container.addMediaGalleryComponents(mediaGallery);

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );

      const buttonRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('avatar_global')
            .setLabel('A')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(!isGuild ? true : false),
          new ButtonBuilder()
            .setCustomId('avatar_guild')
            .setLabel('S')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(isGuild ? true : !guildAvatar)
        );

      container.addActionRowComponents(buttonRow);
      return container;
    };

    const initialAvatar = globalAvatar;
    const initialIsGuild = false;

    const msg = await interaction.reply({
      components: [buildContainer(initialAvatar, initialIsGuild)],
      flags: MessageFlags.IsComponentsV2,
      fetchReply: true
    });

    const collector = msg.createMessageComponentCollector({
      filter: i => i.user.id === interaction.user.id,
      time: 60000
    });

    collector.on('collect', async i => {
      if (i.customId === 'avatar_global') {
        await i.update({
          components: [buildContainer(globalAvatar, false)],
          flags: MessageFlags.IsComponentsV2
        });
      }

      if (i.customId === 'avatar_guild' && guildAvatar) {
        await i.update({
          components: [buildContainer(guildAvatar, true)],
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