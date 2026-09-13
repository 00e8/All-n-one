// © Author:  
// https://discord.gg/wwv

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const { createSession, buildBuilderMessage } = require('../../../lib/containerBuilderState');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('container')
    .setDescription('Build a fully customizable Components V2 container and send it to a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false),

  cooldown: 5,

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        content: 'This command can only be used inside a server.',
        flags: MessageFlags.Ephemeral
      });
    }

    const session = createSession(interaction.user.id, interaction.guild.id);
    const payload = buildBuilderMessage(session);

    await interaction.reply(payload);
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