// © Author:  
// https://discord.gg/wwv



module.exports = {
    name: 'vanity',
    description: 'Show vanity roles commands',
    cooldown: 5,
    aliases: [],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../../lib/helpMenu').sendHelp('vanity', message);
        }
        const hybrid = require('../../hybrid/vanityroles/vanityroles');
        if (hybrid && hybrid.execute) {
            return hybrid.execute(message, args);
        }
        return require('../../lib/helpMenu').sendHelp('vanity', message);
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