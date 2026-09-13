// © Author:  
// https://discord.gg/wwv

const { Events } = require('discord.js');
const lvl = require('../data/leveling');
const levelingService = require('../lib/levelingService');
const { sendLevelUp } = require('../lib/levelingRuntime');

const cooldownCache = new Map();

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        const enabled = await lvl.isSystemEnabled(message.guild.id).catch(() => false);
        if (!enabled) return;

        const key = `${message.author.id}:${message.guild.id}`;
        const lastRun = cooldownCache.get(key) || 0;
        if (Date.now() - lastRun < 2000) return;
        cooldownCache.set(key, Date.now());

        const roleIds = message.member?.roles.cache.map((r) => r.id) ?? [];

        const result = await levelingService
            .processUserMessage(message.author.id, message.guild.id, message.channelId, roleIds)
            .catch((err) => {
                console.error(`[Leveling] processUserMessage failed: ${err.message}`);
                return null;
            });

        if (result?.leveledUp) {
            await sendLevelUp(client, message.channel, message.author, message.guild.id, result.newLevel);
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