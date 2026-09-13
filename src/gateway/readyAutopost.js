// © Author:  
// https://discord.gg/wwv

const { Events } = require('discord.js');
const autopostDb = require('../data/autopost');
const { startAutopostTimer } = require('../hybrid/autopost/autopostTimer');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        try {
            const configs = await autopostDb.getAllConfigs();

            let restored = 0;
            for (const config of configs) {
                const guild = client.guilds.cache.get(config.guildId);
                if (!guild) continue;

                const channel = guild.channels.cache.get(config.channelId);
                if (!channel) continue;

                startAutopostTimer(client, config.guildId, config.category, config.channelId);
                restored++;
            }

            if (restored > 0) {
                console.log(`[Autopost] Restored ${restored} timer(s)`);
            }
        } catch (error) {
            console.error('[Autopost] Error restoring timers:', error);
        }
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