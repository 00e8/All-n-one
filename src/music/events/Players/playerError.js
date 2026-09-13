const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require("discord.js");

module.exports = {
  name: "playerError",
  run: async (client, player, type, error) => {
    try {
      const guild = client.guilds.cache.get(player.guildId);
      if (!guild) return;

      switch (type) {
        case 'TrackStuckEvent':
          if (player.queue.length > 0) {
            const channel = client.channels.cache.get(player.textId);
            if (channel) {
              const stuckDisplay = new TextDisplayBuilder()
                .setContent(
                  `-# Track got stuck.\n` +
                  `-# Skipping to next track.`
                );

              const container = new ContainerBuilder()
                .addTextDisplayComponents(stuckDisplay);

              await channel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2
              }).catch(() => null);
            }
            player.skip();
            return;
          }
          break;

        case 'TrackLoadFailed':
          if (player.queue.length > 0) {
            const channel = client.channels.cache.get(player.textId);
            if (channel) {
              const loadFailDisplay = new TextDisplayBuilder()
                .setContent(
                  `-# Failed to load track.\n` +
                  `-# Skipping to next track.`
                );

              const container = new ContainerBuilder()
                .addTextDisplayComponents(loadFailDisplay);

              await channel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2
              }).catch(() => null);
            }
            player.skip();
            return;
          }
          break;

        default:
          const channel = client.channels.cache.get(player.textId);
          if (channel) {
            const errorDisplay = new TextDisplayBuilder()
              .setContent(
                `-# An unexpected error occurred.\n` +
                `-# The player will be reset.`
              );

            const container = new ContainerBuilder()
              .addTextDisplayComponents(errorDisplay);

            await channel.send({
              components: [container],
              flags: MessageFlags.IsComponentsV2
            }).catch(() => null);
          }
          try {
            await player.destroy(guild.id);
          } catch (e) {
            if (client.manager.players.has(player.guildId)) {
              client.manager.players.delete(player.guildId);
            }
            if (client.manager.shoukaku) {
              client.manager.shoukaku.leaveVoiceChannel(player.guildId).catch(() => null);
            }
          }
      }
    } catch (err) {
      if (player && !player.destroyed) {
        try {
          await player.destroy(guild.id);
        } catch (e) {
          if (client.manager.players.has(player.guildId)) {
            client.manager.players.delete(player.guildId);
          }
          if (client.manager.shoukaku) {
            client.manager.shoukaku.leaveVoiceChannel(player.guildId).catch(() => null);
          }
        }
      }
    }
  },
};