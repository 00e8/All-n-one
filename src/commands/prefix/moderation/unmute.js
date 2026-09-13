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
  name: 'unmute',
  description: 'Unmute muted users',
  cooldown: 5,
  aliases: [],
  
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return modReply(message, 'Permission Denied', '-# You need the permission.');

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers))
      return modReply(message, '-Missing Permissions', '-# I need the permission.');

    const targetInput = args[0];
    const targetMember = message.mentions.members.first() || (targetInput ? await message.guild.members.fetch(targetInput).catch(() => null) : null);
    
    if (!targetMember)
      return modReply(message, 'User Not Found', '-# Please mention or provide a valid user ID to unmute.');

    if (targetMember.roles.highest.position >= message.member.roles.highest.position)
      return modReply(message, 'Cannot Unmute User', '-# They have an equal or higher role than you.');

    if (!targetMember.isCommunicationDisabled())
      return modReply(message, 'User Not Muted', '-# This user is not currently timed out.');

    if (!targetMember.moderatable)
      return modReply(message, 'Cannot Unmute User', '-# I cannot unmute this user. They may have a higher role than me.');

    try {
      await targetMember.timeout(null);
      await modReply(message, 'Unmuted',
        `-# User ${targetMember.user}\n-# by  [${message.author.username}](https://discord.com/users/${message.author.id})`);
    } catch (error) {
      const msg = error.code === 50013 ? '-# I lack the permissions to unmute this user.' : 'Failed to unmute user.';
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