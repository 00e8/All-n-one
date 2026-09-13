const { pool, getOne, run } = require('./pg');
const cacheBus = require('./cacheBus');

const DUPLICATE_LINK_TTL_MS = 60 * 60 * 1000; 

async function initializeDatabase() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS social_downloader_config (
            guild_id TEXT PRIMARY KEY,
            enabled BOOLEAN NOT NULL DEFAULT FALSE
        );
    `);

    const pkColumnCount = await pool.query(`
        SELECT count(*)::int AS cnt
        FROM information_schema.key_column_usage kcu
        JOIN information_schema.table_constraints tc
          ON kcu.constraint_name = tc.constraint_name
        WHERE tc.table_name = 'social_downloader_sent_links'
          AND tc.constraint_type = 'PRIMARY KEY'
    `);
    if (pkColumnCount.rows[0].cnt > 1) {
        await pool.query('DROP TABLE IF EXISTS social_downloader_sent_links;');
    }

    await pool.query(`
        CREATE TABLE IF NOT EXISTS social_downloader_sent_links (
            user_id    TEXT PRIMARY KEY,
            url        TEXT NOT NULL,
            expires_at BIGINT NOT NULL
        );
    `);
}

const isEnabled = async (guildId) => {
    const row = await getOne('SELECT enabled FROM social_downloader_config WHERE guild_id = $1', [guildId]);
    return row ? row.enabled === true : false;
};

const setEnabled = async (guildId, enabled) => {
    const result = await run(
        'INSERT INTO social_downloader_config (guild_id, enabled) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET enabled = $2',
        [guildId, enabled]
    );
    cacheBus.emit('invalidate:socialDownloader', { guildId, enabled });
    return result;
};

const isDuplicateLink = async (userId, url) => {
    const row = await getOne(
        'SELECT url, expires_at FROM social_downloader_sent_links WHERE user_id = $1',
        [userId]
    );
    if (!row) return false;
    if (row.url !== url) return false;
    if (Date.now() >= Number(row.expires_at)) return false; 
    return true;
};

const rememberLink = async (userId, url, ttlMs = DUPLICATE_LINK_TTL_MS) => {
    const expiresAt = Date.now() + ttlMs;
    await run(
        `INSERT INTO social_downloader_sent_links (user_id, url, expires_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id) DO UPDATE SET url = $2, expires_at = $3`,
        [userId, url, expiresAt]
    );
};

const cleanupExpiredLinks = async () => {
    await run('DELETE FROM social_downloader_sent_links WHERE expires_at <= $1', [Date.now()]);
};

const dbReady = initializeDatabase();

dbReady.then(() => {
    setInterval(() => {
        cleanupExpiredLinks().catch((err) => console.error('[SocialDownloader] Link cleanup failed:', err.message));
    }, 30 * 60 * 1000);
});

module.exports = {
    dbReady,
    isEnabled,
    setEnabled,
    isDuplicateLink,
    rememberLink,
};

/**
 * Project: hana
 * Author: nunu.58 (shutup)
 * Organization: HYZEX Development
 * GitHub: https://github.com/ 
 * License: Custom
 * © 2026 HYZEX Development. All rights reserved.
 */