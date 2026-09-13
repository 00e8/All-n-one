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
  name: 'unban',
  description: 'Unban a previously banned user',

  async execute(interaction) {
    const userId = interaction.options.getString('user_id');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers))
      return modReply(interaction, 'Permission Denied', 'You need the permission.', true);

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers))
      return modReply(interaction, 'Missing Permissions', 'I need the permission.', true);

    try {
      const bannedUser = await interaction.guild.bans.fetch(userId).catch(() => null);
      if (!bannedUser)
        return modReply(interaction, 'User Not Banned', 'This user is not banned from the server.', true);

      await interaction.guild.members.unban(userId, reason);
      await modReply(interaction, 'User Unbanned',
        `-# User ${bannedUser.user.tag}\n-# Moderator [${interaction.user.username}](https://discord.com/users/${interaction.user.id})\n-# Reason ${reason}`);
    } catch (error) {
      const msg = error.code === 50013 ? 'I lack the permissions to unban this user.' : 'Failed to unban user. Check the user ID.';
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