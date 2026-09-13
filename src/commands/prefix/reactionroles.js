// © Author:  
// https://discord.gg/wwv



module.exports = {
    name: 'reactionroles',
    description: 'Show reaction roles commands',
    cooldown: 5,
    aliases: ['rr'],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../../lib/helpMenu').sendHelp('reactionroles', message);
        }
        const hybrid = require('../../hybrid/reactionroles/reactionroles');
        if (hybrid && hybrid.execute) {
            return hybrid.execute(message, args);
        }
        return require('../../lib/helpMenu').sendHelp('reactionroles', message);
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