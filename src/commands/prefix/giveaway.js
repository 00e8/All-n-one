// © Author:  
// https://discord.gg/wwv



module.exports = {
    name: 'giveaway',
    description: 'Show giveaway commands',
    cooldown: 5,
    aliases: ['gw'],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../../lib/helpMenu').sendHelp('giveaway', message);
        }
        const hybrid = require('../../hybrid/giveaway/giveaway');
        if (hybrid && hybrid.execute) {
            return hybrid.execute(message, args);
        }
        return require('../../lib/helpMenu').sendHelp('giveaway', message);
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