// © Author:  
// https://discord.gg/wwv



module.exports = {
    name: 'social',
    description: 'Show social commands',
    cooldown: 5,
    aliases: [],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../../lib/helpMenu').sendHelp('social', message);
        }
        return require('../../lib/helpMenu').sendHelp('social', message);
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