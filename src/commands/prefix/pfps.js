// © Author:  
// https://discord.gg/wwv



const path = require('path');
const fs = require('fs');

module.exports = {
    name: 'pfps',
    description: 'Show profile pictures commands',
    cooldown: 5,
    aliases: ['profilepictures'],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../../lib/helpMenu').sendHelp('pfps', message);
        }
        const sub = args[0].toLowerCase();
        const subPath = path.join(__dirname, 'pfps', `${sub}.js`);
        if (fs.existsSync(subPath)) {
            return require(subPath).execute(message, args.slice(1));
        }
        return require('../../lib/helpMenu').sendHelp('pfps', message);
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