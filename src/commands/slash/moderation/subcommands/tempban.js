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
const ms = require('ms');

function modReply(interaction, title, body, ephemeral = false) {
  const container = new ContainerBuilder() 
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${title}`))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
  return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral });
}

module.exports = {
  name: 'tempban',
  description: 'Temporarily ban users',

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const targetMember = interaction.options.getMember('user');
    const duration = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const deleteMessageDays = interaction.options.getInteger('delete_messages') || 0;

    if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers))
      return modReply(interaction, 'Permission Denied', 'You need the permission.', true);

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers))
      return modReply(interaction, 'Missing Permissions', 'I need the permission.', true);

    const time = ms(duration);
    if (!time || time < 1000 || time > 315360000000)
      return modReply(interaction, 'Invalid Duration', 'Provide a valid duration (e.g., 1h, 30m, 1d, 7d).', true);

    if (targetMember && targetMember.roles.highest.position >= interaction.member.roles.highest.position)
      return modReply(interaction, 'Cannot Ban User', 'They have an equal or higher role than you.', true);

    if (targetMember && !targetMember.bannable)
      return modReply(interaction, 'Cannot Ban User', 'I cannot ban this user. They may have a higher role than me.', true);

    try {
      await interaction.guild.members.ban(targetUser, {
        deleteMessageDays,
        reason: `[TEMPBAN ${ms(time, { long: true })}] ${reason}`
      });

      setTimeout(async () => {
        try {
          await interaction.guild.members.unban(targetUser, 'Tempban expired');
        } catch {}
      }, time);

      await modReply(interaction, 'User Temporarily Banned',
        `-# User ${targetUser}\n-# Duration-# ${ms(time, { long: true })}\n-# Moderator [${interaction.user.username}](https://discord.com/users/${interaction.user.id})\n-# Reason ${reason}` +
        (deleteMessageDays > 0 ? `\n**Messages Deleted:** Last ${deleteMessageDays} day(s)` : ''));
    } catch (error) {
      const msg = error.code === 50013 ? 'I lack the permissions to ban this user.' : 'Failed to temporarily ban user.';
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