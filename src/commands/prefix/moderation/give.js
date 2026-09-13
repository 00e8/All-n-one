// © Author:  
// https://discord.gg/wwv

const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
    PermissionFlagsBits,
    ActionRowBuilder,
    StringSelectMenuBuilder
} = require('discord.js');
const emojis = require('../../../emojis.json');

function modReply(message, title, body) {
    const container = new ContainerBuilder() 
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${title}`))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
    return message.reply({ 
        components: [container], 
        flags: MessageFlags.IsComponentsV2, 
        allowedMentions: { 
            parse: [], 
            roles: [] 
        } 
    });
}

module.exports = {
    name: 'role',
    description: 'Toggle (Add/Remove) multiple roles from a user using smart search',
    cooldown: 5,
    aliases: ['r', 'addrole'],
    
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles))
            return modReply(message, 'Permission Denied', `-# You need permission.`);

        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles))
            return modReply(message, 'Missing Permissions', `-# I need the permission.`);

        let targetMember = message.mentions.members.first();
        if (!targetMember && args[0]) {
            const userQuery = args[0];
            const userIdMatch = userQuery.match(/^<?@?!?(\d{17,20})>?$/);
            if (userIdMatch) {
                targetMember = await message.guild.members.fetch(userIdMatch[1]).catch(() => null);
            } else {
                targetMember = message.guild.members.cache.find(m => 
                    m.user.username.toLowerCase() === userQuery.toLowerCase() ||
                    m.displayName.toLowerCase() === userQuery.toLowerCase()
                );
            }
        }
        if (!targetMember)
            return modReply(message, 'User Not Found', '-# Please provide a valid user mention, ID, or username.');

        const rawInput = args.slice(1).join(' ');
        const roleQueries = rawInput.split(',').map(r => r.trim()).filter(r => r.length > 0);

        if (roleQueries.length === 0) {
            return modReply(message, 'Role Not Found', `-# Please provide at least one role name.`);
        }

        const validRoles = message.guild.roles.cache.filter(r => 
            r.id !== message.guild.id && 
            !r.managed && 
            !r.tags?.botId && 
            !r.tags?.integrationId
        );

        const resolvedRoles = [];

        for (const query of roleQueries) {
            const search = query.toLowerCase();

            let matches = validRoles.filter(r => r.name.toLowerCase() === search);
            if (matches.size === 0) {
                matches = validRoles.filter(r => r.name.toLowerCase().startsWith(search));
            }
            if (matches.size === 0) {
                matches = validRoles.filter(r => r.name.toLowerCase().includes(search));
            }

            if (matches.size === 0) {
                return modReply(message, 'Role Not Found', `-# Could not find a role matching: **${query}**`);
            }

            let role = matches.first();

            if (matches.size > 1) {
                const options = matches.map(r => ({ label: r.name, value: r.id })).slice(0, 25);
                const row = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('role_toggle_select_' + Math.random())
                        .setPlaceholder(`Select role for ${query}`)
                        .addOptions(options)
                );

                const selectMenuLayout = message.channel.send({
                    components: [
                        new ContainerBuilder() 
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Selection Required\n-# Please select the correct role for ${query} from the menu below.`))
                            .addActionRowComponents(row)
                    ],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { parse: [], roles: [] }
                });

                const msg = await selectMenuLayout;

                try {
                    const collected = await msg.awaitMessageComponent({
                        filter: i => i.user.id === message.author.id,
                        time: 30000
                    });
                    role = message.guild.roles.cache.get(collected.values[0]);
                    await collected.update({ content: `-# Selected **${role.name}**`, components: [] }).catch(() => {});
                    setTimeout(() => msg.delete().catch(() => {}), 2000);
                } catch (e) {
                    await msg.edit({ components: [], content: "Selection timed out." }).catch(() => {});
                    return;
                }
            }

            if (role.position >= message.guild.members.me.roles.highest.position) {
                return modReply(message, 'Role Too High', `-# I cannot manage the role **${role.name}** as it is higher than or equal to my highest role.`);
            }

            if (message.author.id !== message.guild.ownerId && role.position >= message.member.roles.highest.position) {
                return modReply(message, 'Role Too High', `-# You cannot manage the role **${role.name}** higher than or equal to your highest role.`);
            }

            resolvedRoles.push(role);
        }

        const addedRoles = [];
        const removedRoles = [];

        try {
            for (const role of resolvedRoles) {
                const hasRole = targetMember.roles.cache.has(role.id);
                const reason = `[ROLE] By ${message.author.tag} ${hasRole ? 'removed' : 'added'} role ${role.name}`;

                if (hasRole) {
                    await targetMember.roles.remove(role, reason);
                    removedRoles.push(role);
                } else {
                    await targetMember.roles.add(role, reason);
                    addedRoles.push(role);
                }
            }

            let description = `> -# User ${targetMember.user}\n`;
            if (addedRoles.length > 0) {
                description += `> -# Added ${addedRoles.map(r => `${r}`).join(', ')}\n`;
            }
            if (removedRoles.length > 0) {
                description += `> -# Removed ${removedRoles.map(r => `${r}`).join(', ')}\n`;
            }
            description += `> -# by [${message.author.tag}](https://discord.com/users/${message.author.id})`;

            return modReply(message, 'Roles Updated', description);

        } catch (err) {
            console.error("Error managing roles", err);
            return modReply(message, 'Error', 'Failed to update roles.');
        }
    },
};

/**
 * Project: hana
 * Author: nunu.58 (shutup)
 * Organization: HYZEX Development
 * GitHub: https://github.com/ 
 * License: Custom
 * © 2026 HYZEX Development. All rights reserved.
 */ 