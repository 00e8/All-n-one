const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require("discord.js");

const emoji = require("../../emojis");
const { safeDestroyPlayer } = require("../../utils/playerUtils");

module.exports = {
  name: "stop",
  category: "Music",
  cooldown: 5,
  description: "Stops the music",
  args: false,
  usage: "",
  userPrams: [],
  botPrams: ["EMBED_LINKS"],
  dj: true,
  owner: false,
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  slashOptions: [],

  async slashExecute(interaction, client) {
    const interactionWrapper = {
      guild: interaction.guild,
      channel: interaction.channel,
      author: interaction.user,
      member: interaction.member,
      createdTimestamp: interaction.createdTimestamp,

      reply: async (options) => {
        if (interaction.deferred) {
          return await interaction.editReply(options);
        }

        if (interaction.replied) {
          return await interaction.followUp(options);
        }

        return await interaction.reply(options);
      },
    };

    const args = [];

    if (interaction.options) {
      const options = interaction.options.data;

      for (const option of options) {
        if (option.value !== undefined) {
          args.push(option.value.toString());
        }
      }
    }

    return this.execute(
      interactionWrapper,
      args,
      client,
      client.prefix
    );
  },

  async execute(message, args, client, prefix) {
    const guildId = message.guild.id;

    const player = client.manager.players.get(guildId);

    if (!player) {
      const errorDisplay = new TextDisplayBuilder()
        .setContent(`-# Play a song first`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      return message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (!player.queue.current) {
      const errorDisplay = new TextDisplayBuilder()
        .setContent(`-# Play a song first`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      return message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
    if (!player.data) {
      player.data = new Map();
    }

    player.data.set("manualDisconnect", true);
    try {
      player.queue.clear();
    } catch {}

    player.loop = "none";
    if (player.voiceId) {
      await client.rest
        .put(`/channels/${player.voiceId}/voice-status`, {
          body: { status: "" }
        })
        .catch(() => null);
    }
    const twoFourSeven =
      client.db.twofourseven.get(guildId);
    if (twoFourSeven) {

      try {
        if (typeof player.stop === "function") {
          await player.stop();
        } else {
          await player.skip();
        }
      } catch (error) {
        console.error(
          `[Music] Failed to stop player in 247 mode for ${guildId}:`,
          error
        );
      }
      player.data.delete("manualDisconnect");

    } else {
      if (client.voiceHealthMonitor) {
        client.voiceHealthMonitor.stopMonitoring(guildId);
      }

      const reconnectTimeout =
        player.data.get("reconnectTimeout");

      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        player.data.delete("reconnectTimeout");
      }

      player.data.delete("reconnectAttempts");

      await safeDestroyPlayer(player);
      await new Promise(resolve =>
        setTimeout(resolve, 1500)
      );
    }

    const successDisplay = new TextDisplayBuilder()
      .setContent(`-# Stopped playback and cleared`);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(successDisplay);

    return message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },
};