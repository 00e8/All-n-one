// © Author:
// https://discord.gg/wwv
//
// Small emoji lookup for the ticket system. Reuses the bot's existing
// synced emojis where a matching one already exists, and otherwise
// falls back to a plain unicode emoji so nothing depends on new
// custom emojis being added to emojis.json.

const emojis = require('../../emojis.json');

module.exports = {
    ticket: '🎫',
    cross: emojis.cross || '❌',
    check: emojis.check || '✅',
    warning: emojis.warning || '⚠️',
    add: '➕',
    remove: '➖',
    settings: '⚙️',
    lock: '🔒',
    dashboard: '📊',
};

/**
 * Project: hana
 * Author: nunu.58 (shutup)
 * Organization: HYZEX Development
 * GitHub: https://github.com/
 * License: Custom
 * © 2026 HYZEX Development. All rights reserved.
 */
