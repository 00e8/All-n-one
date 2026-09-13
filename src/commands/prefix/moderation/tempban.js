// © Author:  
// https://discord.gg/wwv

const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  SeparatorSpacingSize, MessageFlags, PermissionFlagsBits,
} = require('discord.js');
const ms = require('ms');

function modReply(message, title, body) {
  const container = new ContainerBuilder() 
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${title}`))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
  return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
}

module.exports = {
  name: 'tempban',
  description: 'Temporarily ban users',
  cooldown: 5,
  aliases: [],
  
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
      return modReply(message, '-Permission Denied', '-# You need the permission.');

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers))
      return modReply(message, '-Missing Permissions', '-# I need the permission.');

    const targetInput = args[0];
    const targetUser = message.mentions.users.first() || (targetInput ? await message.client.users.fetch(targetInput).catch(() => null) : null);
    const targetMember = message.mentions.members.first() || (targetInput ? await message.guild.members.fetch(targetInput).catch(() => null) : null);
    
    if (!targetUser)
      return modReply(message, 'User Not Found', '-# Please mention or provide a valid user ID to tempban.');

    const duration = args[1];
    if (!duration)
      return modReply(message, 'Missing Duration', '-# Please provide a duration (e.g., 1h, 30m, 1d).');

    const time = ms(duration);
    if (!time || time < 1000 || time > 315360000000)
      return modReply(message, 'Invalid Duration', 'Provide a valid duration (e.g., 1h, 30m, 1d, 7d).');

    if (targetMember && targetMember.roles.highest.position >= message.member.roles.highest.position)
      return modReply(message, 'Cannot Ban User', 'They have an equal or higher role than you.');

    if (targetMember && !targetMember.bannable)
      return modReply(message, 'Cannot Ban User', 'I cannot ban this user. They may have a higher role than me.');

    const reason = args.slice(2).join(' ') || 'No reason provided';

    try {
      await message.guild.members.ban(targetUser, {
        deleteMessageDays: 1,
        reason: `[TEMPBAN ${ms(time, { long: true })}] ${reason}`
      });

      setTimeout(async () => {
        try { await message.guild.members.unban(targetUser, 'Tempban expired'); } catch {}
      }, time);

      await modReply(message, 'Temporarily Banned',
        `-# User ${targetUser}\n-# Duration ${ms(time, { long: true })}\n-# Moderator [${message.author.username}](https://discord.com/users/${message.author.id})\n-# Reason ${reason}`);
    } catch (error) {
      const msg = error.code === 50013 ? '-# I lack the permissions to ban this user.' : 'Failed to temporarily ban user.';
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