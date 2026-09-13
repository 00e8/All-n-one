// © Author:  
// https://discord.gg/wwv

const ReactionRoles = require('../data/models/ReactionRoles');
const cacheBus = require('../data/cacheBus');

const reactionRoleCache = new Map();
const CACHE_TTL = 30000;

// Apply reaction-role add/edit/remove changes immediately instead of
// waiting up to CACHE_TTL for the stale cached config to expire.
cacheBus.on('invalidate:ReactionRoles', ({ messageId, guildId }) => {
    if (messageId && guildId) reactionRoleCache.delete(`${messageId}:${guildId}`);
});

async function getReactionRoleConfig(messageId, guildId) {
    const key = `${messageId}:${guildId}`;
    const cached = reactionRoleCache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.val;

    const config = await ReactionRoles.findOne({
        where: { messageId, guildId, enabled: true }
    });
    reactionRoleCache.set(key, { val: config, ts: Date.now() });
    return config;
}

function invalidateReactionRoleCache(messageId, guildId) {
    reactionRoleCache.delete(`${messageId}:${guildId}`);
}

function getPairs(config) {
    let pairs = config.emojiRolePairs;
    if (typeof pairs === 'string') {
        try { pairs = JSON.parse(pairs); } catch (e) { pairs = []; }
    }
    return Array.isArray(pairs) ? pairs : [];
}

function findMatchingPair(pairs, emoji) {
    const emojiString = emoji.toString().trim();
    const emojiId = emoji.id;
    const emojiName = emoji.name;

    for (const p of pairs) {
        const storedEmoji = (p.emoji || '').trim();
        if (storedEmoji === emojiString) return p;
        if (emojiId && storedEmoji === emojiId) return p;
        if (emojiId && storedEmoji.includes(emojiId)) return p;
        if (emojiName && storedEmoji.includes(emojiName)) return p;
    }
    return null;
}

module.exports = { getReactionRoleConfig, invalidateReactionRoleCache, getPairs, findMatchingPair };

/**
 * Project: hana
 * Author: nunu.58 (shutup)
 * Organization: HYZEX Development
 * GitHub: https://github.com/ 
 * License: Custom
 * © 2026 HYZEX Development. All rights reserved.
 */