// © Author:  
// https://discord.gg/wwv

// Lightweight event bus used to invalidate in-memory config caches
// the instant a setting is written to the database, instead of
// waiting for the cache's TTL to expire (previously up to 30-120s).
//
// Sequelize models (via BaseModel) emit `invalidate:<ModelName>` automatically
// after create/update/upsert/destroy. Raw-SQL data modules emit the same
// event manually right after a successful write. Gateway/cache modules
// subscribe to the relevant event(s) and drop the now-stale cache entry.

const EventEmitter = require('events');

class CacheBus extends EventEmitter {}

const cacheBus = new CacheBus();
cacheBus.setMaxListeners(100);

module.exports = cacheBus;

/**
 * Project: hana
 * Author: nunu.58 (shutup)
 * Organization: HYZEX Development
 * GitHub: https://github.com/ 
 * License: Custom
 * © 2026 HYZEX Development. All rights reserved.
 */
