// © Author:  
// https://discord.gg/wwv



const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('support')
        .setDescription('Get the support server invite link'),

    name: 'support',
    aliases: [],
    description: 'Get the support server invite link',
    cooldown: 5,

    async execute(interactionOrMessage) {
        const config = require('../../config');
        return interactionOrMessage.reply(config.SUPPORT_SERVER);
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