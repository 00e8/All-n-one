// © Author:  
// https://discord.gg/wwv



const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  PermissionFlagsBits,
} = require('discord.js');

function modReply(interaction, title, body, ephemeral = false) {
  const container = new ContainerBuilder() 
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${title}`))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
  return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral });
}

module.exports = {
  name: 'slowmode',
  description: 'Set the slowmode for a channel',

  async execute(interaction) {
    const seconds = interaction.options.getInteger('seconds');
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels))
      return modReply(interaction, 'Permission Denied', 'You need the permission.', true);

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels))
      return modReply(interaction, 'Missing Permissions', 'I need the permission.', true);

    try {
      if (channel.rateLimitPerUser > 0 && seconds > 0) {
        await channel.setRateLimitPerUser(seconds);
        return modReply(interaction, 'Slowmode Updated',
          `-# Channel-#  ${channel}\n-# Duration-#  ${seconds} second(s)\n-# Set by-#   [${interaction.user.username}](https://discord.com/users/${interaction.user.id})`);
      }

      if (channel.rateLimitPerUser > 0) {
        await channel.setRateLimitPerUser(0);
        return modReply(interaction, 'Slowmode Disabled',
          `-# Channel ${channel}\n-# Set by [${interaction.user.username}](https://discord.com/users/${interaction.user.id})`);
      }

      await channel.setRateLimitPerUser(seconds);
      await modReply(interaction, seconds === 0 ? '-# Slowmode Disabled' : 'Slowmode Enabled',
        `-# Channel ${channel}\n-# Duration ${seconds === 0 ? 'Disabled' : `${seconds} second(s)`}\n-# Set by [${interaction.user.username}](https://discord.com/users/${interaction.user.id})`);
    } catch (error) {
      const msg = error.code === 50013 ? 'I lack the permissions to modify this channel.' : 'Failed to set slowmode.';
      await modReply(interaction, 'Error', msg, true);
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