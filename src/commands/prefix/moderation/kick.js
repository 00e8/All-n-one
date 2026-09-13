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
  name: 'kick',
  description: 'Kick users from the server',
  cooldown: 5,
  aliases: [],
  
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers))
      return modReply(message, 'Permission Denied', '-# You need the permission.');

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers))
      return modReply(message, 'Missing Permissions', '-# I need the permission.');

    const targetInput = args[0];
    const targetMember = message.mentions.members.first() || (targetInput ? await message.guild.members.fetch(targetInput).catch(() => null) : null);
    
    if (!targetMember)
      return modReply(message, 'User Not Found', '-# Please mention or provide a valid user ID to kick.');

    if (targetMember.roles.highest.position >= message.member.roles.highest.position)
      return modReply(message, 'Cannot Kick User', '-# They have an equal or higher role than you.');

    if (!targetMember.kickable)
      return modReply(message, 'Cannot Kick User', 'I cannot kick this user. They may have a higher role than me.');

    const reason = args.slice(1).join(' ') || 'No reason provided';

    try {
      await targetMember.kick(reason);
      await modReply(message, 'Kicked',
        `-# User ${targetMember.user}\n-# Moderator [${message.author.username}](https://discord.com/users/${message.author.id})\n-# Reason ${reason}`);
    } catch (error) {
      const msg = error.code === 50013 ? '-# I lack the permissions to kick this user.' : '-# Failed to kick user.';
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