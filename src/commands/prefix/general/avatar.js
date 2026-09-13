// © Author:  
// https://discord.gg/wwv

const {
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
  name: 'avatar',
  aliases: ['av'],
  cooldown: 5,
  description: 'Get the avatar of a user',
  usage: 'avatar [user]',
  category: 'general',
  
  async execute(message, args) {
    let user;
    let member;

    if (message.mentions.users.size) {
      user = message.mentions.users.first();
      member = message.mentions.members.first();
    } else if (args[0]) {
      user = await message.client.users.fetch(args[0]).catch(() => null);
      member = user ? await message.guild.members.fetch(user.id).catch(() => null) : null;
    } else {
      user = message.author;
      member = message.member;
    }

    if (!user) return message.reply("User not found.");

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
      const container = new ContainerBuilder() ;

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

    const msg = await message.reply({
      components: [buildContainer(globalAvatar, false)],
      flags: MessageFlags.IsComponentsV2
    });

    const collector = msg.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id,
      time: 60000
    });

    collector.on('collect', async interaction => {
      if (interaction.customId === 'avatar_global') {
        await interaction.update({
          components: [buildContainer(globalAvatar, false)],
          flags: MessageFlags.IsComponentsV2
        });
      }

      if (interaction.customId === 'avatar_guild' && guildAvatar) {
        await interaction.update({
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