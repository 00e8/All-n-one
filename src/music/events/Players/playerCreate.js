const { KazagumoPlayer } = require("kazagumo");

module.exports = {
  name: "playerCreate",

  run: async (client, player) => {
    const guildPrefix = client.db.prefixes.get(player.guildId);
    const prefix = guildPrefix?.prefix || client.prefix;

    client.rest
      .put(`/channels/${player.voiceId}/voice-status`, {
        body: { status: `idle` },
      })
      .catch(() => null);

    const guild = client.guilds.cache.get(player.guildId);
    if (!guild) return;

    if (client.voiceHealthMonitor) {
      client.voiceHealthMonitor.startMonitoring(player);
    }
  },
};