const { pool, getOne, getAll, run } = require('./pg');

async function initializeDatabase() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS lvl_users (
            user_id     TEXT NOT NULL,
            guild_id    TEXT NOT NULL,
            xp          BIGINT NOT NULL DEFAULT 0,
            level       INTEGER NOT NULL DEFAULT 0,
            messages    BIGINT NOT NULL DEFAULT 0,
            voice_mins  BIGINT NOT NULL DEFAULT 0,
            voice_secs  BIGINT NOT NULL DEFAULT 0,
            last_xp_at  BIGINT NOT NULL DEFAULT 0,
            created_at  BIGINT NOT NULL DEFAULT extract(epoch from now()),
            updated_at  BIGINT NOT NULL DEFAULT extract(epoch from now()),
            PRIMARY KEY (user_id, guild_id)
        );

        CREATE TABLE IF NOT EXISTS lvl_streaks (
            user_id       TEXT NOT NULL,
            guild_id      TEXT NOT NULL,
            current       INTEGER NOT NULL DEFAULT 0,
            best          INTEGER NOT NULL DEFAULT 0,
            last_day      TEXT,
            last_claim_at BIGINT NOT NULL DEFAULT 0,
            PRIMARY KEY (user_id, guild_id)
        );

        CREATE TABLE IF NOT EXISTS lvl_message_logs (
            id         BIGSERIAL PRIMARY KEY,
            user_id    TEXT NOT NULL,
            guild_id   TEXT NOT NULL,
            channel_id TEXT NOT NULL,
            xp_gained  INTEGER NOT NULL DEFAULT 0,
            ts         BIGINT NOT NULL DEFAULT extract(epoch from now())
        );

        CREATE TABLE IF NOT EXISTS lvl_voice_logs (
            id            BIGSERIAL PRIMARY KEY,
            user_id       TEXT NOT NULL,
            guild_id      TEXT NOT NULL,
            channel_id    TEXT NOT NULL,
            joined_at     BIGINT NOT NULL,
            left_at       BIGINT,
            mins          BIGINT NOT NULL DEFAULT 0,
            duration_secs BIGINT NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS lvl_guild_settings (
            guild_id             TEXT PRIMARY KEY,
            prefix               TEXT NOT NULL DEFAULT '!',
            enabled       INTEGER NOT NULL DEFAULT 0,
            level_up_enabled     INTEGER NOT NULL DEFAULT 1,
            level_up_channel     TEXT,
            level_up_dm          INTEGER NOT NULL DEFAULT 0,
            level_up_message     TEXT NOT NULL DEFAULT '{mention} leveled up to Level {level}',
            xp_min               INTEGER NOT NULL DEFAULT 15,
            xp_max               INTEGER NOT NULL DEFAULT 40,
            xp_cooldown_secs     INTEGER NOT NULL DEFAULT 60,
            stack_rewards        INTEGER NOT NULL DEFAULT 1,
            voice_xp_enabled     INTEGER NOT NULL DEFAULT 1,
            voice_xp_per_min     INTEGER NOT NULL DEFAULT 10,
            invite_link          TEXT,
            support_link         TEXT,
            level_up_background  TEXT
        );

        CREATE TABLE IF NOT EXISTS lvl_level_rewards (
            id       BIGSERIAL PRIMARY KEY,
            guild_id TEXT NOT NULL,
            level    INTEGER NOT NULL,
            role_id  TEXT NOT NULL,
            UNIQUE(guild_id, level, role_id)
        );

        CREATE TABLE IF NOT EXISTS lvl_level_reward_claims (
            user_id    TEXT NOT NULL,
            guild_id   TEXT NOT NULL,
            level      INTEGER NOT NULL,
            role_id    TEXT NOT NULL,
            claimed_at BIGINT NOT NULL DEFAULT extract(epoch from now()),
            PRIMARY KEY (user_id, guild_id, level, role_id)
        );

        CREATE TABLE IF NOT EXISTS lvl_xp_multipliers (
            id         BIGSERIAL PRIMARY KEY,
            guild_id   TEXT NOT NULL,
            target_id  TEXT NOT NULL,
            type       TEXT NOT NULL CHECK(type IN ('channel','role')),
            multiplier REAL NOT NULL DEFAULT 1.0,
            UNIQUE(guild_id, target_id, type)
        );

        CREATE TABLE IF NOT EXISTS lvl_xp_blacklist (
            guild_id  TEXT NOT NULL,
            target_id TEXT NOT NULL,
            type      TEXT NOT NULL CHECK(type IN ('channel','role','user')),
            PRIMARY KEY (guild_id, target_id, type)
        );

        CREATE INDEX IF NOT EXISTS idx_lvl_users_guild_xp ON lvl_users(guild_id, xp DESC);
        CREATE INDEX IF NOT EXISTS idx_lvl_users_guild_voice ON lvl_users(guild_id, voice_secs DESC);
        CREATE INDEX IF NOT EXISTS idx_lvl_message_logs_guild_user ON lvl_message_logs(guild_id, user_id);
        CREATE INDEX IF NOT EXISTS idx_lvl_voice_logs_guild_user ON lvl_voice_logs(guild_id, user_id);
        CREATE INDEX IF NOT EXISTS idx_lvl_level_rewards ON lvl_level_rewards(guild_id, level);
        CREATE INDEX IF NOT EXISTS idx_lvl_xp_mult ON lvl_xp_multipliers(guild_id);
        CREATE INDEX IF NOT EXISTS idx_lvl_xp_bl ON lvl_xp_blacklist(guild_id);
    `);

    // Migration safety net: add the column if lvl_guild_settings already existed
    // from a previous deployment without it.
    await pool.query(`
        ALTER TABLE lvl_guild_settings ADD COLUMN IF NOT EXISTS enabled INTEGER NOT NULL DEFAULT 0;
    `);
}

const nowTs = () => Math.floor(Date.now() / 1000);

const ensureUser = (userId, guildId) =>
    run('INSERT INTO lvl_users (user_id, guild_id) VALUES ($1, $2) ON CONFLICT (user_id, guild_id) DO NOTHING', [userId, guildId]);

const getUser = (userId, guildId) =>
    getOne('SELECT * FROM lvl_users WHERE user_id = $1 AND guild_id = $2', [userId, guildId]);

const addXP = (userId, guildId, xp, ts) =>
    run('UPDATE lvl_users SET xp = xp + $1, last_xp_at = $2, updated_at = extract(epoch from now()) WHERE user_id = $3 AND guild_id = $4', [xp, ts, userId, guildId]);

const incrementMessages = (userId, guildId) =>
    run('UPDATE lvl_users SET messages = messages + 1, updated_at = extract(epoch from now()) WHERE user_id = $1 AND guild_id = $2', [userId, guildId]);

const setLevel = (userId, guildId, level) =>
    run('UPDATE lvl_users SET level = $1, updated_at = extract(epoch from now()) WHERE user_id = $2 AND guild_id = $3', [level, userId, guildId]);

const setXP = (userId, guildId, xp, level) =>
    run('UPDATE lvl_users SET xp = $1, level = $2, updated_at = extract(epoch from now()) WHERE user_id = $3 AND guild_id = $4', [xp, level, userId, guildId]);

const addVoice = (userId, guildId, durationSecs, xp) =>
    run(
        `UPDATE lvl_users SET voice_secs = voice_secs + $1, voice_mins = floor((voice_secs + $1) / 60), xp = xp + $2, updated_at = extract(epoch from now())
         WHERE user_id = $3 AND guild_id = $4`,
        [durationSecs, xp, userId, guildId]
    );

const leaderboard = (guildId, limit = 10) =>
    getAll('SELECT user_id, xp, level, messages, voice_mins, voice_secs FROM lvl_users WHERE guild_id = $1 ORDER BY xp DESC LIMIT $2', [guildId, limit]);

const topChatters = (guildId, limit = 10) =>
    getAll(
        `SELECT user_id, xp, level, messages, voice_mins, voice_secs FROM lvl_users
         WHERE guild_id = $1 AND messages > 0 ORDER BY messages DESC, xp DESC, user_id ASC LIMIT $2`,
        [guildId, limit]
    );

const topSpeakers = (guildId, limit = 10) =>
    getAll(
        `SELECT user_id, xp, level, messages, voice_mins, voice_secs FROM lvl_users
         WHERE guild_id = $1 AND voice_secs > 0 ORDER BY voice_secs DESC, xp DESC, user_id ASC LIMIT $2`,
        [guildId, limit]
    );

const getRank = async (userId, guildId) => {
    const row = await getOne(
        `SELECT COUNT(*) + 1 AS rank FROM lvl_users
         WHERE guild_id = $1 AND xp > (SELECT xp FROM lvl_users WHERE user_id = $2 AND guild_id = $1)`,
        [guildId, userId]
    );
    return row ? parseInt(row.rank) : 1;
};

const ensureStreak = (userId, guildId) =>
    run('INSERT INTO lvl_streaks (user_id, guild_id) VALUES ($1, $2) ON CONFLICT (user_id, guild_id) DO NOTHING', [userId, guildId]);

const getStreak = (userId, guildId) =>
    getOne('SELECT * FROM lvl_streaks WHERE user_id = $1 AND guild_id = $2', [userId, guildId]);

const updateStreak = (userId, guildId, current, lastDay, lastClaimAt) =>
    run(
        'UPDATE lvl_streaks SET current = $1, best = GREATEST(best, $1), last_day = $2, last_claim_at = $3 WHERE user_id = $4 AND guild_id = $5',
        [current, lastDay, lastClaimAt, userId, guildId]
    );

const resetStreak = (userId, guildId, current, lastDay, lastClaimAt) =>
    run(
        'UPDATE lvl_streaks SET current = $1, last_day = $2, last_claim_at = $3 WHERE user_id = $4 AND guild_id = $5',
        [current, lastDay, lastClaimAt, userId, guildId]
    );

const logMessage = (userId, guildId, channelId, xp) =>
    run('INSERT INTO lvl_message_logs (user_id, guild_id, channel_id, xp_gained) VALUES ($1, $2, $3, $4)', [userId, guildId, channelId, xp]);

const voiceJoin = (userId, guildId, channelId, joinedAt) =>
    run('INSERT INTO lvl_voice_logs (user_id, guild_id, channel_id, joined_at) VALUES ($1, $2, $3, $4)', [userId, guildId, channelId, joinedAt]);

const voiceLeave = (userId, guildId, leftAt, mins, durationSecs) =>
    run(
        `UPDATE lvl_voice_logs SET left_at = $1, mins = $2, duration_secs = $3
         WHERE id = (SELECT id FROM lvl_voice_logs WHERE user_id = $4 AND guild_id = $5 AND left_at IS NULL ORDER BY id DESC LIMIT 1)`,
        [leftAt, mins, durationSecs, userId, guildId]
    );

const openVoiceSessions = () =>
    getAll('SELECT user_id, guild_id, channel_id, joined_at FROM lvl_voice_logs WHERE left_at IS NULL ORDER BY id ASC', []);

const SETTINGS_FIELDS = [
    'prefix', 'enabled', 'level_up_enabled', 'level_up_channel', 'level_up_dm', 'level_up_message',
    'xp_min', 'xp_max', 'xp_cooldown_secs', 'stack_rewards', 'voice_xp_enabled', 'voice_xp_per_min',
    'invite_link', 'support_link', 'level_up_background',
];

const ensureGuildSettings = (guildId) =>
    run('INSERT INTO lvl_guild_settings (guild_id) VALUES ($1) ON CONFLICT (guild_id) DO NOTHING', [guildId]);

// In-memory cache so we don't hit Postgres on every single message just to
// check whether leveling is enabled for a guild. Same pattern as
// aiChannel.js's aiChannelCache. Invalidated whenever settings are patched.
const guildSettingsCache = new Map();
const GUILD_SETTINGS_CACHE_TTL = 30000;

function getCachedGuildSettings(guildId) {
    const e = guildSettingsCache.get(guildId);
    if (e && Date.now() - e.ts < GUILD_SETTINGS_CACHE_TTL) return e.val;
    return undefined;
}
function setCachedGuildSettings(guildId, val) {
    guildSettingsCache.set(guildId, { val, ts: Date.now() });
}
function invalidateGuildSettings(guildId) {
    guildSettingsCache.delete(guildId);
}

const getGuildSettings = async (guildId) => {
    const cached = getCachedGuildSettings(guildId);
    if (cached !== undefined) return cached;

    await ensureGuildSettings(guildId);
    const settings = await getOne('SELECT * FROM lvl_guild_settings WHERE guild_id = $1', [guildId]);
    setCachedGuildSettings(guildId, settings);
    return settings;
};

const isSystemEnabled = async (guildId) => {
    const s = await getGuildSettings(guildId);
    return (s?.enabled ?? 0) === 1;
};

const patchGuildSettings = async (guildId, field, value) => {
    if (!SETTINGS_FIELDS.includes(field)) throw new Error(`Unknown field ${field}`);
    await ensureGuildSettings(guildId);
    const result = await run(`UPDATE lvl_guild_settings SET ${field} = $1 WHERE guild_id = $2`, [value, guildId]);
    invalidateGuildSettings(guildId);
    return result;
};

const listRewards = (guildId) =>
    getAll('SELECT * FROM lvl_level_rewards WHERE guild_id = $1 ORDER BY level ASC', [guildId]);

const rewardsForLevel = (guildId, level) =>
    getAll('SELECT * FROM lvl_level_rewards WHERE guild_id = $1 AND level <= $2 ORDER BY level ASC', [guildId, level]);

const addReward = (guildId, level, roleId) =>
    run('INSERT INTO lvl_level_rewards (guild_id, level, role_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [guildId, level, roleId]);

const removeReward = (guildId, level, roleId) =>
    run('DELETE FROM lvl_level_rewards WHERE guild_id = $1 AND level = $2 AND role_id = $3', [guildId, level, roleId]);

const removeRewardLevel = (guildId, level) =>
    run('DELETE FROM lvl_level_rewards WHERE guild_id = $1 AND level = $2', [guildId, level]);

const listClaims = (userId, guildId) =>
    getAll('SELECT * FROM lvl_level_reward_claims WHERE user_id = $1 AND guild_id = $2 ORDER BY level ASC', [userId, guildId]);

const addClaim = (userId, guildId, level, roleId) =>
    run('INSERT INTO lvl_level_reward_claims (user_id, guild_id, level, role_id) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING', [userId, guildId, level, roleId]);

const getMultipliers = (guildId) =>
    getAll('SELECT * FROM lvl_xp_multipliers WHERE guild_id = $1', [guildId]);

const setMultiplier = (guildId, targetId, type, multiplier) =>
    run(
        `INSERT INTO lvl_xp_multipliers (guild_id, target_id, type, multiplier) VALUES ($1, $2, $3, $4)
         ON CONFLICT (guild_id, target_id, type) DO UPDATE SET multiplier = $4`,
        [guildId, targetId, type, multiplier]
    );

const removeMultiplier = (guildId, targetId, type) =>
    run('DELETE FROM lvl_xp_multipliers WHERE guild_id = $1 AND target_id = $2 AND type = $3', [guildId, targetId, type]);

const getBlacklist = (guildId) =>
    getAll('SELECT * FROM lvl_xp_blacklist WHERE guild_id = $1', [guildId]);

const isBlacklisted = async (guildId, targetId, type) => {
    const row = await getOne('SELECT 1 FROM lvl_xp_blacklist WHERE guild_id = $1 AND target_id = $2 AND type = $3', [guildId, targetId, type]);
    return !!row;
};

const addBlacklist = (guildId, targetId, type) =>
    run('INSERT INTO lvl_xp_blacklist (guild_id, target_id, type) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [guildId, targetId, type]);

const removeBlacklist = (guildId, targetId, type) =>
    run('DELETE FROM lvl_xp_blacklist WHERE guild_id = $1 AND target_id = $2 AND type = $3', [guildId, targetId, type]);

const dbReady = initializeDatabase();

module.exports = {
    dbReady,
    nowTs,
    ensureUser, getUser, addXP, incrementMessages, setLevel, setXP, addVoice,
    leaderboard, topChatters, topSpeakers, getRank,
    ensureStreak, getStreak, updateStreak, resetStreak,
    logMessage, voiceJoin, voiceLeave, openVoiceSessions,
    ensureGuildSettings, getGuildSettings, patchGuildSettings, isSystemEnabled,
    listRewards, rewardsForLevel, addReward, removeReward, removeRewardLevel,
    listClaims, addClaim,
    getMultipliers, setMultiplier, removeMultiplier,
    getBlacklist, isBlacklisted, addBlacklist, removeBlacklist,
};

/**
 * Project: hana
 * Author: nunu.58 (shutup)
 * Organization: HYZEX Development
 * GitHub: https://github.com/ 
 * License: Custom
 * © 2026 HYZEX Development. All rights reserved.
 */