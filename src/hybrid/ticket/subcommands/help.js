// © Author:
// https://discord.gg/wwv
//
// /ticket help — quick reference for the ticket system's subcommands.

const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const emoji = require('../../../lib/ticket/emoji');

async function execute(ctx) {
    const c = new ContainerBuilder();
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Ticket `));
    c.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        '> - -# **`/ticket panel`** — Create/manage the server\'s ticket panel and categories (Manage Server)\n' +
        '> - -# **`/ticket settings`** — Configure prefix, staff roles, and the blacklist (Manage Server)\n' +
        '> - -# **`/ticket add <user>`** — Add a user to the current ticket\n' +
        '> - -# **`/ticket remove <user>`** — Remove a user from the current ticket\n' +
        '> - -# **`/ticket close`** — Close and delete the current ticket\n' +
        '> - -# **`/ticket blacklist add|remove|list`** — Manage who can create tickets (Manage Server)'
    ));
    return ctx.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
}

module.exports = { execute };

/**
 * Project: hana
 * Author: nunu.58 (shutup)
 * Organization: HYZEX Development
 * GitHub: https://github.com/
 * License: Custom
 * © 2026 HYZEX Development. All rights reserved.
 */
