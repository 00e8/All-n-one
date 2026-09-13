// © Author:
// https://discord.gg/wwv
//
// /ticket blacklist add|remove|list — manage users blocked from
// creating tickets.

const { PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const db = require('../../../lib/ticket/db');
const emoji = require('../../../lib/ticket/emoji');

function box(title, text) {
    return new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${title} ${text}`));
}

async function execute(ctx, subcommand) {
    if (!ctx.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return ctx.reply({ components: [box(`Permission Denied`, '-# You need **Manage Server** to use this command.')], flags: MessageFlags.IsComponentsV2 });
    }

    if (subcommand === 'add') return add(ctx);
    if (subcommand === 'remove') return remove(ctx);
    if (subcommand === 'list') return list(ctx);
    return ctx.reply({ components: [box('Unknown Subcommand', '-# Use `add`, `remove`, or `list`.')], flags: MessageFlags.IsComponentsV2 });
}

function resolveTargetUser(ctx) {
    if (ctx.isSlash) return ctx.interaction.options.getUser('user');
    return ctx.message.mentions.users.first();
}

async function add(ctx) {
    const targetUser = resolveTargetUser(ctx);
    if (!targetUser) {
        return ctx.reply({ components: [box(`Missing User`, '-# Please mention or select a user to blacklist.')], flags: MessageFlags.IsComponentsV2 });
    }

    const reason = ctx.isSlash ? null : ctx.args.slice(1).join(' ') || null;

    const already = await db.isUserBlacklisted(ctx.guild.id, targetUser.id);
    if (already) {
        return ctx.reply({ components: [box('Already Blacklisted', `-# <@${targetUser.id}> is already blacklisted.`)], flags: MessageFlags.IsComponentsV2 });
    }

    await db.addBlacklistedUser(ctx.guild.id, targetUser.id, reason, ctx.author.id);
    return ctx.reply({ components: [box(`User Blacklisted`, `-# <@${targetUser.id}> can no longer create tickets.`)], flags: MessageFlags.IsComponentsV2 });
}

async function remove(ctx) {
    const targetUser = resolveTargetUser(ctx);
    if (!targetUser) {
        return ctx.reply({ components: [box(`Missing User`, '-# Please mention or select a user to remove from the blacklist.')], flags: MessageFlags.IsComponentsV2 });
    }

    const already = await db.isUserBlacklisted(ctx.guild.id, targetUser.id);
    if (!already) {
        return ctx.reply({ components: [box('Not Blacklisted', `-# <@${targetUser.id}> is not currently blacklisted.`)], flags: MessageFlags.IsComponentsV2 });
    }

    await db.removeBlacklistedUser(ctx.guild.id, targetUser.id);
    return ctx.reply({ components: [box(`Blacklist Cleared`, `-# <@${targetUser.id}> can now create tickets again.`)], flags: MessageFlags.IsComponentsV2 });
}

async function list(ctx) {
    const blacklisted = await db.getBlacklistedUsers(ctx.guild.id);
    if (blacklisted.length === 0) {
        return ctx.reply({ components: [box(`Blacklisted Users`, '-# No users are currently blacklisted.')], flags: MessageFlags.IsComponentsV2 });
    }

    const text = blacklisted.map(bl => `<@${bl.userId}> — ${bl.reason || 'No reason'}`).join('\n');
    return ctx.reply({ components: [box(`-# Blacklisted Users`, text)], flags: MessageFlags.IsComponentsV2 });
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
