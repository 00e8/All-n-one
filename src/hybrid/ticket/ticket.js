// © Author:
// https://discord.gg/wwv

const { SlashCommandBuilder } = require('discord.js');
const { buildContext } = require('../../lib/ticket/context');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Manage the ticket system')
        .addSubcommand(sub => sub.setName('panel').setDescription('Open the ticket panel builder for this server'))
        .addSubcommand(sub => sub.setName('settings').setDescription('Configure ticket server settings'))
        .addSubcommand(sub => sub.setName('add').setDescription('Add a user to the current ticket').addUserOption(o => o.setName('user').setDescription('User to add')))
        .addSubcommand(sub => sub.setName('remove').setDescription('Remove a user from the current ticket').addUserOption(o => o.setName('user').setDescription('User to remove')))
        .addSubcommand(sub => sub.setName('close').setDescription('Close and delete the current ticket'))
        .addSubcommand(sub => sub.setName('help').setDescription('Show the ticket system help panel'))
        .addSubcommandGroup(group => group
            .setName('blacklist')
            .setDescription('Manage users blacklisted from creating tickets')
            .addSubcommand(sub => sub.setName('add').setDescription('Blacklist a user from creating tickets').addUserOption(o => o.setName('user').setDescription('User to blacklist').setRequired(true)))
            .addSubcommand(sub => sub.setName('remove').setDescription('Remove a user from the blacklist').addUserOption(o => o.setName('user').setDescription('User to remove').setRequired(true)))
            .addSubcommand(sub => sub.setName('list').setDescription('List all blacklisted users'))
        ),

    name: 'ticket',
    cooldown: 5,
    aliases: ['tickets'],
    category: 'utility',

    async execute(interactionOrMessage, args = []) {
        const isSlash = interactionOrMessage.isChatInputCommand?.();
        let group = null;
        let subcommand;

        if (isSlash) {
            group = interactionOrMessage.options.getSubcommandGroup(false);
            subcommand = interactionOrMessage.options.getSubcommand();
        } else {
            const first = args[0]?.toLowerCase();
            if (first === 'blacklist') {
                group = 'blacklist';
                subcommand = args[1]?.toLowerCase();
                args = args.slice(2);
            } else {
                subcommand = first;
                args = args.slice(1);
            }
        }

        const validSubs = ['panel', 'settings', 'add', 'remove', 'close', 'help'];
        const validBlacklistSubs = ['add', 'remove', 'list'];

        if (group === 'blacklist') {
            if (!validBlacklistSubs.includes(subcommand)) {
                return require('../../lib/helpMenu').sendHelp('tickets', interactionOrMessage);
            }
            const ctx = buildContext(interactionOrMessage, args);
            const blacklist = require('./subcommands/blacklist');
            return blacklist.execute(ctx, subcommand);
        }

        if (!subcommand || !validSubs.includes(subcommand)) {
            return require('../../lib/helpMenu').sendHelp('tickets', interactionOrMessage);
        }

        const ctx = buildContext(interactionOrMessage, args);
        const subcommandFile = require(`./subcommands/${subcommand}`);
        return subcommandFile.execute(ctx);
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
