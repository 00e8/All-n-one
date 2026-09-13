const { Events } = require("discord.js");

const RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 2000;

module.exports = {
  name: Events.VoiceStateUpdate,

  execute: async (oldState, newState, client) => {
    try {
   
      if (oldState.id !== client.user.id) return;
      if (!oldState.channelId || newState.channelId) return;

      const guildId = oldState.guild.id;

      const player =
        client.manager?.players.get(guildId);

      if (!player || player.destroyed) return;
      if (player.data?.get("manualDisconnect") === true) {
        client.logger?.log(
          `MusicReconnect Ignoring intentional disconnect in guild ${guildId}`,
          "debug"
        );

        return;
      }

      
      if (!client.manager.players.has(guildId)) {
        return;
      }

      const voiceChannelId =
        player.voiceId || oldState.channelId;

      client.logger?.log(
        `MusicReconnect Bot was disconnected from VC in guild ${guildId}, attempting to reconnect...`,
        "warn"
      );

      let reconnected = false;

      for (
        let attempt = 1;
        attempt <= RECONNECT_ATTEMPTS;
        attempt++
      ) {

        
        if (
          player.data?.get("manualDisconnect") === true ||
          player.destroyed ||
          !client.manager.players.has(guildId)
        ) {
          client.logger?.log(
            `MusicReconnect Cancelled reconnect for guild ${guildId}`,
            "debug"
          );

          return;
        }

        try {

          await player.setVoiceChannel(
            voiceChannelId
          );

          await player.connect();

          reconnected = true;

          client.logger?.log(
            `MusicReconnect Successfully reconnected in guild ${guildId} (attempt ${attempt})`,
            "log"
          );

          break;

        } catch (err) {

          const msg =
            err?.message ||
            err?.toString() ||
            "";

          if (
            msg.toLowerCase().includes(
              "already connected"
            )
          ) {
            reconnected = true;
            break;
          }

          client.logger?.log(
            `MusicReconnect Reconnect attempt ${attempt}/${RECONNECT_ATTEMPTS} failed in guild ${guildId}: ${msg}`,
            "error"
          );

          if (
            attempt < RECONNECT_ATTEMPTS
          ) {
            await new Promise(resolve =>
              setTimeout(
                resolve,
                RECONNECT_DELAY_MS
              )
            );
          }
        }
      }
      if (
        !reconnected &&
        player.data?.get("manualDisconnect") !== true &&
        !player.destroyed
      ) {

        const textChannel =
          client.channels.cache.get(
            player.textId
          );

        if (textChannel) {
          await textChannel
            .send({
              content:
                `-# I was disconnected from the voice channel and couldn't reconnect. Please use the play command again.`
            })
            .catch(() => null);
        }

        try {

          const {
            safeDestroyPlayer
          } = require(
            "../music/utils/playerUtils"
          );

          await safeDestroyPlayer(player);

        } catch {

          try {
            await player.destroy();
          } catch {}
        }
      }

    } catch (err) {

      client.logger?.log(
        `MusicReconnect Error handling voice disconnect: ${err.message}`,
        "error"
      );
    }
  },
};