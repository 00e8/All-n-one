// © Author:  
// https://discord.gg/wwv



const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('j2c')
        .setDescription('Join to Create voice channel management')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Setup the Join to Create system')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription('View the current J2C configuration')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset the J2C configuration')
        ),

    name: 'j2c',
    aliases: ['join2create'],
    description: 'Join to Create voice channel management',
    cooldown: 5,
    category: 'general',

    async execute(interactionOrMessage, args = []) {
        const isSlash = interactionOrMessage.isCommand?.();

        let subcommand;

        if (isSlash) {
            subcommand = interactionOrMessage.options.getSubcommand();
        } else {
            subcommand = args[0]?.toLowerCase();
            args = args.slice(1);
        }

        if (!subcommand || !['setup', 'config', 'reset'].includes(subcommand)) {
            return require('../../lib/helpMenu').sendHelp('j2c', interactionOrMessage);
        }

        const subcommandFile = require(`./subcommands/${subcommand}`);
        return subcommandFile.execute(interactionOrMessage, args);
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