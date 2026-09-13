// © Author:  
// https://discord.gg/wwv



module.exports = {
    name: 'tracking',
    description: 'Show tracking commands',
    cooldown: 5,
    aliases: [],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../../lib/helpMenu').sendHelp('tracking', message);
        }
        return require('../../lib/helpMenu').sendHelp('tracking', message);
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