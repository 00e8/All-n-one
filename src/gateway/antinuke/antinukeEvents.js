// © Author:  
// https://discord.gg/wwv



const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
    AuditLogEvent,
    PermissionFlagsBits
} = require('discord.js');
const { AntinukeConfig, AntinukeWhitelist } = require('../../data/models');
const cacheBus = require('../../data/cacheBus');

const actionTracker = new Map();
const pendingPunishments = new Set();

const antinukeConfigCache = new Map();
const whitelistCache = new Map();
const ANTINUKE_CACHE_TTL = 120000;
const WHITELIST_CACHE_TTL = 120000;

// Apply `/antinuke` changes immediately instead of waiting up to
// ANTINUKE_CACHE_TTL / WHITELIST_CACHE_TTL (2 minutes) for the stale cache to expire.
cacheBus.on('invalidate:AntinukeConfig', ({ guildId }) => {
    if (guildId) antinukeConfigCache.delete(guildId);
});
cacheBus.on('invalidate:AntinukeWhitelist', ({ guildId, userId }) => {
    if (guildId && userId) whitelistCache.delete(`${guildId}:${userId}`);
});

function getCachedConfig(guildId) {
    const entry = antinukeConfigCache.get(guildId);
    if (entry && Date.now() - entry.ts < ANTINUKE_CACHE_TTL) return entry.val;
    return undefined;
}
function setCachedConfig(guildId, val) {
    antinukeConfigCache.set(guildId, { val, ts: Date.now() });
}

function getCachedWhitelist(guildId, userId) {
    const key = `${guildId}:${userId}`;
    const entry = whitelistCache.get(key);
    if (entry && Date.now() - entry.ts < WHITELIST_CACHE_TTL) return entry.val;
    return undefined;
}
function setCachedWhitelist(guildId, userId, val) {
    whitelistCache.set(`${guildId}:${userId}`, { val, ts: Date.now() });
}

function getTrackerKey(guildId, userId, action) {
    return `${guildId}-${userId}-${action}`;
}

function trackAction(guildId, userId, action) {
    const key = getTrackerKey(guildId, userId, action);
    const now = Date.now();

    if (!actionTracker.has(key)) {
        actionTracker.set(key, []);
    }

    actionTracker.get(key).push(now);
}

function getActionCount(guildId, userId, action, timeframeMs) {
    const key = getTrackerKey(guildId, userId, action);
    const now = Date.now();

    if (!actionTracker.has(key)) {
        return 0;
    }

    const actions = actionTracker.get(key).filter(time => now - time < timeframeMs);

    if (actions.length === 0) {
        actionTracker.delete(key);
    } else {
        actionTracker.set(key, actions);
    }

    return actions.length;
}

function cleanupOldActions() {
    const now = Date.now();
    const maxAge = 3600000;

    for (const [key, times] of actionTracker.entries()) {
        const recentTimes = times.filter(time => now - time < maxAge);
        if (recentTimes.length === 0) {
            actionTracker.delete(key);
        } else if (recentTimes.length !== times.length) {
            actionTracker.set(key, recentTimes);
        }
    }

    for (const [key, entry] of antinukeConfigCache.entries()) {
        if (now - entry.ts >= ANTINUKE_CACHE_TTL * 5) antinukeConfigCache.delete(key);
    }
    for (const [key, entry] of whitelistCache.entries()) {
        if (now - entry.ts >= WHITELIST_CACHE_TTL * 5) whitelistCache.delete(key);
    }
}

async function getConfig(guildId) {
    let config = getCachedConfig(guildId);
    if (config === undefined) {
        config = await AntinukeConfig.findOne({ where: { guildId } });
        setCachedConfig(guildId, config);
    }
    return config;
}

async function isWhitelisted(guildId, userId, eventType = null) {
    let entry = getCachedWhitelist(guildId, userId);
    if (entry === undefined) {
        entry = await AntinukeWhitelist.findOne({ where: { guildId, userId } });
        setCachedWhitelist(guildId, userId, entry);
    }
    if (!entry) return false;

    const events = entry.events;
    if (!events || events.length === 0) return true;

    if (eventType && events.includes(eventType)) return true;

    return !eventType;
}

function buildRestoreRoleOptions(role) {
    return {
        name: role.name,
        color: role.color,
        hoist: role.hoist,
        permissions: role.permissions,
        mentionable: role.mentionable,
        position: role.position,
        reason: 'Antinuke: Restoring role deleted without authorization'
    };
}

function buildRestoreChannelOptions(channel) {
    const options = {
        name: channel.name,
        type: channel.type,
        reason: 'Antinuke: Restoring channel deleted without authorization'
    };
    if (channel.parentId) options.parent = channel.parentId;
    if (typeof channel.topic === 'string') options.topic = channel.topic;
    if (typeof channel.nsfw === 'boolean') options.nsfw = channel.nsfw;
    if (typeof channel.rateLimitPerUser === 'number') options.rateLimitPerUser = channel.rateLimitPerUser;
    if (typeof channel.bitrate === 'number') options.bitrate = channel.bitrate;
    if (typeof channel.userLimit === 'number') options.userLimit = channel.userLimit;
    if (typeof channel.rawPosition === 'number') options.position = channel.rawPosition;
    if (channel.permissionOverwrites?.cache) {
        options.permissionOverwrites = Array.from(channel.permissionOverwrites.cache.values()).map(o => ({
            id: o.id, type: o.type, allow: o.allow, deny: o.deny
        }));
    }
    return options;
}

function buildRevertRoleOptions(oldRole) {
    return {
        name: oldRole.name,
        color: oldRole.color,
        hoist: oldRole.hoist,
        permissions: oldRole.permissions,
        mentionable: oldRole.mentionable,
        reason: 'Antinuke: Reverting unauthorized role update'
    };
}

function buildRevertChannelOptions(oldChannel) {
    const options = {
        name: oldChannel.name,
        reason: 'Antinuke: Reverting unauthorized channel edit'
    };
    if (oldChannel.parentId !== undefined) options.parent = oldChannel.parentId;
    if (typeof oldChannel.topic === 'string') options.topic = oldChannel.topic;
    if (typeof oldChannel.nsfw === 'boolean') options.nsfw = oldChannel.nsfw;
    if (typeof oldChannel.rateLimitPerUser === 'number') options.rateLimitPerUser = oldChannel.rateLimitPerUser;
    if (typeof oldChannel.bitrate === 'number') options.bitrate = oldChannel.bitrate;
    if (typeof oldChannel.userLimit === 'number') options.userLimit = oldChannel.userLimit;
    if (oldChannel.permissionOverwrites?.cache) {
        options.permissionOverwrites = Array.from(oldChannel.permissionOverwrites.cache.values()).map(o => ({
            id: o.id, type: o.type, allow: o.allow, deny: o.deny
        }));
    }
    return options;
}

function buildRevertGuildOptions(oldGuild) {
    const options = {
        name: oldGuild.name,
        verificationLevel: oldGuild.verificationLevel,
        explicitContentFilter: oldGuild.explicitContentFilter,
        defaultMessageNotifications: oldGuild.defaultMessageNotifications,
        afkChannel: oldGuild.afkChannelId,
        afkTimeout: oldGuild.afkTimeout,
        systemChannel: oldGuild.systemChannelId,
        rulesChannel: oldGuild.rulesChannelId,
        description: oldGuild.description,
        premiumProgressBarEnabled: oldGuild.premiumProgressBarEnabled,
        reason: 'Antinuke: Reverting unauthorized server update'
    };
    if (oldGuild.icon) options.icon = oldGuild.iconURL({ size: 1024 });
    if (oldGuild.banner) options.banner = oldGuild.bannerURL({ size: 1024 });
    if (oldGuild.splash) options.splash = oldGuild.splashURL({ size: 1024 });
    return options;
}

async function getAuditLogExecutor(guild, auditType, targetId = null, timeWindow = 5000) {
    try {
        const auditLogs = await guild.fetchAuditLogs({ type: auditType, limit: 5 });
        const now = Date.now();

        for (const entry of auditLogs.entries.values()) {
            if ((now - entry.createdTimestamp) < timeWindow) {
                if (!targetId || entry.target?.id === targetId) {
                    return entry.executor;
                }
            }
        }
        return null;
    } catch {
        return null;
    }
}

async function executePunishment(guild, user, config, reason) {
    try {
        const member = await guild.members.fetch(user.id).catch(() => null);
        if (!member) return;

        if (member.id === guild.ownerId) return;

        const botMember = guild.members.me;
        if (!botMember || member.roles.highest.position >= botMember.roles.highest.position) return;

        switch (config.punishment) {
            case 'stripall': {
                const rolesToRemove = member.roles.cache
                    .filter(r => r.id !== guild.id && r.position < botMember.roles.highest.position);
                if (rolesToRemove.size > 0) {
                    await member.roles.remove(rolesToRemove, `Antinuke: ${reason}`).catch(() => {});
                }
                break;
            }
            case 'kick':
                await member.kick(`Antinuke: ${reason}`).catch(() => {});
                break;
            case 'ban':
                await guild.members.ban(user.id, { reason: `Antinuke: ${reason}` }).catch(() => {});
                break;
        }

        await sendLog(guild, config, user, reason, config.punishment);
    } catch {}
}

async function sendLog(guild, config, user, reason, punishment) {
    if (!config.logChannelId) return;

    try {
        const channel = guild.channels.cache.get(config.logChannelId);
        if (!channel) return;

        const punishmentLabels = {
            stripall: 'Roles Stripped',
            kick: 'Kicked',
            ban: 'Banned'
        };

        const container = new ContainerBuilder() 
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('-# Antinuke Triggered')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `> -# User ${user.username} (${user.id})\n` +
                    `> -# Reason ${reason}\n` +
                    `> -# Action Taken ${punishmentLabels[punishment] || punishment}\n` +
                    `> -# Time <t:${Math.floor(Date.now() / 1000)}:F>`
                )
            );

        await channel.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    } catch {}
}

const INSTANT_PUNISH_ACTIONS = new Set([
    'channel_create',
    'channel_delete',
    'channel_edit',
    'role_create',
    'role_delete',
    'role_update',
    'webhook_create',
    'emoji_create',
    'emoji_delete',
    'emoji_update',
    'guild_update'
]);

async function isProtectedAction(guild, executor, action) {
    if (!executor) return false;
    if (executor.id === guild.ownerId) return false;
    if (executor.id === guild.client.user.id) return false;
    if (await isWhitelisted(guild.id, executor.id, action)) return false;
    return true;
}

async function handleAntiAction(guild, executor, action, config) {
    if (!(await isProtectedAction(guild, executor, action))) return;

    const punishKey = `${guild.id}:${executor.id}`;

    if (INSTANT_PUNISH_ACTIONS.has(action)) {
        if (pendingPunishments.has(punishKey)) return;
        pendingPunishments.add(punishKey);
        setTimeout(() => pendingPunishments.delete(punishKey), 30000);
        await executePunishment(guild, executor, config, `Unauthorized ${action.replace(/_/g, ' ')} detected`);
        return;
    }

    trackAction(guild.id, executor.id, action);
    const count = getActionCount(guild.id, executor.id, action, config.timeframe * 1000);

    if (count >= config.threshold) {
        if (pendingPunishments.has(punishKey)) return;
        pendingPunishments.add(punishKey);
        setTimeout(() => pendingPunishments.delete(punishKey), 30000);
        await executePunishment(guild, executor, config, `Mass ${action} detected (${count} actions)`);
    }
}

module.exports = {
    name: 'antinukeEvents',

    async init(client) {
        setInterval(cleanupOldActions, 300000);

        client.on('guildBanAdd', async (ban) => {
            const config = await getConfig(ban.guild.id);
            if (!config?.enabled || !config.antiBan) return;

            const executor = await getAuditLogExecutor(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);
            await handleAntiAction(ban.guild, executor, 'ban', config);
        });

        client.on('guildMemberRemove', async (member) => {
            const config = await getConfig(member.guild.id);
            if (!config?.enabled || !config.antiKick) return;

            const executor = await getAuditLogExecutor(member.guild, AuditLogEvent.MemberKick, member.id);
            if (executor) {
                await handleAntiAction(member.guild, executor, 'kick', config);
            }
        });

        client.on('channelCreate', async (channel) => {
            if (!channel.guild) return;
            const config = await getConfig(channel.guild.id);
            if (!config?.enabled || !config.antiChannelCreate) return;

            const executor = await getAuditLogExecutor(channel.guild, AuditLogEvent.ChannelCreate, channel.id);

            if (await isProtectedAction(channel.guild, executor, 'channel_create')) {
                try {
                    await channel.delete('Antinuke: Removing channel created without authorization');
                } catch (e) {
                    console.error('Antinuke: Failed to delete unauthorized channel:', e.message);
                }
            }

            await handleAntiAction(channel.guild, executor, 'channel_create', config);
        });

        client.on('channelDelete', async (channel) => {
            if (!channel.guild) return;
            const config = await getConfig(channel.guild.id);
            if (!config?.enabled || !config.antiChannelDelete) return;

            const executor = await getAuditLogExecutor(channel.guild, AuditLogEvent.ChannelDelete, channel.id);

            if (await isProtectedAction(channel.guild, executor, 'channel_delete')) {
                try {
                    await channel.guild.channels.create(buildRestoreChannelOptions(channel));
                } catch (e) {
                    console.error('Antinuke: Failed to restore deleted channel:', e.message);
                }
            }

            await handleAntiAction(channel.guild, executor, 'channel_delete', config);
        });

        client.on('roleCreate', async (role) => {
            const config = await getConfig(role.guild.id);
            if (!config?.enabled || !config.antiRoleCreate) return;

            const executor = await getAuditLogExecutor(role.guild, AuditLogEvent.RoleCreate, role.id);

            if (await isProtectedAction(role.guild, executor, 'role_create')) {
                try {
                    await role.delete('Antinuke: Removing role created without authorization');
                } catch (e) {
                    console.error('Antinuke: Failed to delete unauthorized role:', e.message);
                }
            }

            await handleAntiAction(role.guild, executor, 'role_create', config);
        });

        client.on('roleDelete', async (role) => {
            const config = await getConfig(role.guild.id);
            if (!config?.enabled || !config.antiRoleDelete) return;

            const executor = await getAuditLogExecutor(role.guild, AuditLogEvent.RoleDelete, role.id);

            if (await isProtectedAction(role.guild, executor, 'role_delete')) {
                try {
                    await role.guild.roles.create(buildRestoreRoleOptions(role));
                } catch (e) {
                    console.error('Antinuke: Failed to restore deleted role:', e.message);
                }
            }

            await handleAntiAction(role.guild, executor, 'role_delete', config);
        });

        client.on('roleUpdate', async (oldRole, newRole) => {
            const config = await getConfig(newRole.guild.id);
            if (!config?.enabled || !config.antiRoleUpdate) return;

            const dangerousPerms = [
                PermissionFlagsBits.Administrator,
                PermissionFlagsBits.BanMembers,
                PermissionFlagsBits.KickMembers,
                PermissionFlagsBits.ManageGuild,
                PermissionFlagsBits.ManageChannels,
                PermissionFlagsBits.ManageRoles,
                PermissionFlagsBits.ManageWebhooks
            ];

            let dangerousChange = false;
            for (const perm of dangerousPerms) {
                if (!oldRole.permissions.has(perm) && newRole.permissions.has(perm)) {
                    dangerousChange = true;
                    break;
                }
            }

            if (!dangerousChange) return;

            const executor = await getAuditLogExecutor(newRole.guild, AuditLogEvent.RoleUpdate, newRole.id);

            if (await isProtectedAction(newRole.guild, executor, 'role_update')) {
                try {
                    await newRole.edit(buildRevertRoleOptions(oldRole));
                } catch (e) {
                    console.error('Antinuke: Failed to revert role update:', e.message);
                }
            }

            await handleAntiAction(newRole.guild, executor, 'role_update', config);
        });

        client.on('webhookCreate', async (webhook) => {
            const config = await getConfig(webhook.guildId);
            if (!config?.enabled || !config.antiWebhook) return;

            const guild = client.guilds.cache.get(webhook.guildId);
            if (!guild) return;

            const executor = await getAuditLogExecutor(guild, AuditLogEvent.WebhookCreate, webhook.id);

            if (await isProtectedAction(guild, executor, 'webhook_create')) {
                try {
                    await webhook.delete('Antinuke: Removing webhook created without authorization');
                } catch (e) {
                    console.error('Antinuke: Failed to delete unauthorized webhook:', e.message);
                }
            }

            await handleAntiAction(guild, executor, 'webhook_create', config);
        });

        client.on('guildMemberAdd', async (member) => {
            if (!member.user.bot) return;

            const config = await getConfig(member.guild.id);
            if (!config?.enabled || !config.antiBot) return;

            const executor = await getAuditLogExecutor(member.guild, AuditLogEvent.BotAdd, member.id);
            if (!executor) return;
            if (executor.id === member.guild.ownerId) return;
            if (executor.id === member.guild.client.user.id) return;
            if (await isWhitelisted(member.guild.id, executor.id, 'bot_add')) return;

            try {
                await member.kick('Antinuke: Unauthorized bot addition');
                await executePunishment(member.guild, executor, config, 'Unauthorized bot addition');
            } catch {}
        });

        client.on('guildUpdate', async (oldGuild, newGuild) => {
            const config = await getConfig(newGuild.id);
            if (!config?.enabled || !config.antiGuildUpdate) return;

            const executor = await getAuditLogExecutor(newGuild, AuditLogEvent.GuildUpdate);

            if (await isProtectedAction(newGuild, executor, 'guild_update')) {
                try {
                    await newGuild.edit(buildRevertGuildOptions(oldGuild));
                } catch (e) {
                    console.error('Antinuke: Failed to revert guild update:', e.message);
                }
            }

            await handleAntiAction(newGuild, executor, 'guild_update', config);
        });

        client.on('emojiCreate', async (emoji) => {
            const config = await getConfig(emoji.guild.id);
            if (!config?.enabled || !config.antiEmoji) return;

            const executor = await getAuditLogExecutor(emoji.guild, AuditLogEvent.EmojiCreate, emoji.id);

            if (await isProtectedAction(emoji.guild, executor, 'emoji_create')) {
                try {
                    await emoji.delete('Antinuke: Removing emoji created without authorization');
                } catch (e) {
                    console.error('Antinuke: Failed to delete unauthorized emoji:', e.message);
                }
            }

            await handleAntiAction(emoji.guild, executor, 'emoji_create', config);
        });

        client.on('emojiDelete', async (emoji) => {
            const config = await getConfig(emoji.guild.id);
            if (!config?.enabled || !config.antiEmoji) return;

            const executor = await getAuditLogExecutor(emoji.guild, AuditLogEvent.EmojiDelete, emoji.id);

            if (await isProtectedAction(emoji.guild, executor, 'emoji_delete')) {
                try {
                    await emoji.guild.emojis.create({
                        attachment: emoji.imageURL(),
                        name: emoji.name,
                        reason: 'Antinuke: Restoring emoji deleted without authorization'
                    });
                } catch (e) {
                    console.error('Antinuke: Failed to restore deleted emoji:', e.message);
                }
            }

            await handleAntiAction(emoji.guild, executor, 'emoji_delete', config);
        });

        client.on('emojiUpdate', async (oldEmoji, newEmoji) => {
            const config = await getConfig(newEmoji.guild.id);
            if (!config?.enabled || !config.antiEmoji) return;

            const executor = await getAuditLogExecutor(newEmoji.guild, AuditLogEvent.EmojiUpdate, newEmoji.id);

            if (await isProtectedAction(newEmoji.guild, executor, 'emoji_update')) {
                try {
                    await newEmoji.edit({ name: oldEmoji.name, reason: 'Antinuke: Reverting unauthorized emoji update' });
                } catch (e) {
                    console.error('Antinuke: Failed to revert emoji update:', e.message);
                }
            }

            await handleAntiAction(newEmoji.guild, executor, 'emoji_update', config);
        });

        client.on('channelUpdate', async (oldChannel, newChannel) => {
            if (!newChannel.guild) return;
            const config = await getConfig(newChannel.guild.id);
            if (!config?.enabled || !config.antiChannelEdit) return;

            const executor = await getAuditLogExecutor(newChannel.guild, AuditLogEvent.ChannelUpdate, newChannel.id);

            if (await isProtectedAction(newChannel.guild, executor, 'channel_edit')) {
                try {
                    await newChannel.edit(buildRevertChannelOptions(oldChannel));
                } catch (e) {
                    console.error('Antinuke: Failed to revert channel edit:', e.message);
                }
            }

            await handleAntiAction(newChannel.guild, executor, 'channel_edit', config);
        });
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