// © Author:  
// https://discord.gg/wwv

const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  SeparatorSpacingSize, MessageFlags, PermissionFlagsBits,
} = require('discord.js');

function modReply(message, title, body) {
  const container = new ContainerBuilder() 
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${title}`))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
  return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
}

module.exports = {
  name: 'slowmode',
  description: 'Set the slowmode for a channel',
  cooldown: 5,
  aliases: [],
  
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
      return modReply(message, 'Permission Denied', '-# You need the permission.');

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels))
      return modReply(message, 'Missing Permissions', '-# I need the permission.');

    const channel = message.mentions.channels.first() || message.channel;

    if (!args[0]) {
      try {
        if (channel.rateLimitPerUser > 0) {
          await channel.setRateLimitPerUser(0);
          return modReply(message, 'Slowmode Disabled',
            `-# Channel ${channel}\n-# Set by [${message.author.username}](https://discord.com/users/${message.author.id})`);
        }
        return modReply(message, 'No Slowmode Active', '-# This channel does not have slowmode enabled. Provide a duration in seconds to enable it.');
      } catch (error) {
        const msg = error.code === 50013 ? '-# I lack the permissions to modify this channel.' : 'Failed to toggle slowmode.';
        return modReply(message, 'Error', msg);
      }
    }

    const seconds = parseInt(args[0]);
    if (isNaN(seconds) || seconds < 0 || seconds > 21600)
      return modReply(message, 'Invalid Duration', 'Provide a valid duration in seconds (0-21600).');

    try {
      await channel.setRateLimitPerUser(seconds);
      await modReply(message, seconds === 0 ? '-# Slowmode Disabled' : 'Slowmode Enabled',
        `-# Channel ${channel}\n-# Duration ${seconds === 0 ? 'Disabled' : `-# ${seconds} second(s)`}\n-# Set by [${message.author.username}](https://discord.com/users/${message.author.id})`);
    } catch (error) {
      const msg = error.code === 50013 ? '-# I lack the permissions to modify this channel.' : 'Failed to set slowmode.';
      await modReply(message, 'Error', msg);
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