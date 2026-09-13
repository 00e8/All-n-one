const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require("discord.js");
const emoji = require("../../emojis");
const { safeDestroyPlayer } = require("../../utils/playerUtils");

module.exports = {
  name: "leave",
  aliases: ["dc", "disconnect"],
  category: "Music",
  cooldown: 5,
  description: "Leave voice channel",
  args: false,
  usage: "",
  userPrams: [],
  botPrams: ["EmbedLinks"],
  owner: false,
  player: false,
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
        } else if (interaction.replied) {
          return await interaction.followUp(options);
        } else {
          return await interaction.reply(options);
        }
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

    const prefix = client.prefix;
    return this.execute(interactionWrapper, args, client, prefix);
  },

  async execute(message, args, client, prefix) {
    const player = client.manager.players.get(message.guild.id);

    if (!player) {
      const errorDisplay = new TextDisplayBuilder()
        .setContent(`-#   I'm not in any **voice** channel`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      return message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const twoFourSeven = client.db.twofourseven.get(message.guild.id);
    const previousVoiceId = player.voiceId;
    const previousTextId = player.textId;

    client.rest
      .put(`/channels/${player.voiceId}/voice-status`, { body: { status: `` } })
      .catch(() => null);

    await safeDestroyPlayer(player);

    if (twoFourSeven) {
      // Actually deliver on the "I'll rejoin automatically" promise below: recreate a
      // fresh, idle player on the 24/7 channel instead of just leaving and hoping
      // something else brings the bot back. Guarded with a timeout so a stuck rejoin
      // can never hang this command and block the reply below.
      await new Promise(resolve => setTimeout(resolve, 800));
      try {
        const rejoinPromise = client.manager.createPlayer({
          guildId: message.guild.id,
          voiceId: twoFourSeven.voiceId || previousVoiceId,
          textId: twoFourSeven.textId || previousTextId,
          volume: 80,
          deaf: true,
        });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("24/7 rejoin timed out")), 8000)
        );
        await Promise.race([rejoinPromise, timeoutPromise]);
      } catch (err) {
        console.error(`[Music] Failed to rejoin 24/7 channel after leave for guild ${message.guild.id}:`, err);
      }
    }

    if (twoFourSeven) {
      const successDisplay = new TextDisplayBuilder()
        .setContent(
          `-#   Left the voice channel.` +
          `-# 247 mode is active - I'll rejoin automatically.`
        );

      const container = new ContainerBuilder()
        .addTextDisplayComponents(successDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      }).catch(() =>
        message.channel.send({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        })
      );
    }

    const successDisplay = new TextDisplayBuilder()
      .setContent(`-# Left the voice channel.`);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(successDisplay);

    return message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    }).catch(() =>
      message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      })
    );
  },
};