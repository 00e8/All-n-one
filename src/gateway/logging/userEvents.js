// © Author:  
// https://discord.gg/wwv

const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags,
    AuditLogEvent
} = require('discord.js');
const { getLogChannel, fetchAuditLogEntry: fetchAuditLogExecutor } = require('./loggingUtils');

module.exports = {
    name: 'userEvents',

    async init(client) {
        client.on('guildMemberUpdate', async (oldMember, newMember) => {
            const logChannel = await getLogChannel(client, newMember.guild.id, 'memberLogs', 'user');
            if (!logChannel) return;

            const changes = [];
            let executorText = '';

            const nicknameChanged = oldMember.nickname !== newMember.nickname;
            const oldRoles = oldMember.roles.cache;
            const newRoles = newMember.roles.cache;
            const addedRoles = newRoles.filter(r => !oldRoles.has(r.id) && r.id !== newMember.guild.id);
            const removedRoles = oldRoles.filter(r => !newRoles.has(r.id) && r.id !== newMember.guild.id);
            const rolesChanged = addedRoles.size > 0 || removedRoles.size > 0;
            const timeoutChanged = oldMember.communicationDisabledUntil !== newMember.communicationDisabledUntil;
            const pendingChanged = oldMember.pending !== newMember.pending && !newMember.pending;

            const NONE = Promise.resolve({ executor: null, reason: null });
            const [nickResult, roleResult, timeoutResult] = await Promise.all([
                nicknameChanged ? fetchAuditLogExecutor(newMember.guild, AuditLogEvent.MemberUpdate, newMember.id) : NONE,
                rolesChanged ? fetchAuditLogExecutor(newMember.guild, AuditLogEvent.MemberRoleUpdate, newMember.id) : NONE,
                timeoutChanged ? fetchAuditLogExecutor(newMember.guild, AuditLogEvent.MemberUpdate, newMember.id) : NONE
            ]);

            if (nicknameChanged) {
                changes.push(`-# Nickname ${oldMember.nickname || 'None'} > ${newMember.nickname || 'None'}`);
                if (nickResult.executor) executorText = `> -# Changed By <@${nickResult.executor.id}>\n`;
            }

            if (rolesChanged) {
                if (addedRoles.size > 0) changes.push(`> -# Roles Added ${addedRoles.map(r => r.name).join(', ')}`);
                if (removedRoles.size > 0) changes.push(`> -# Roles Removed ${removedRoles.map(r => r.name).join(', ')}`);
                if (roleResult.executor) executorText = `> -# Changed By <@${roleResult.executor.id}>\n`;
            }

            if (timeoutChanged) {
                if (newMember.communicationDisabledUntil) {
                    changes.push(`-# Timeout Until <t:${Math.floor(newMember.communicationDisabledUntil.getTime() / 1000)}:F>`);
                    if (timeoutResult.reason) changes.push(`-# Reason ${timeoutResult.reason}`);
                    if (timeoutResult.executor) executorText = `> -# Timed Out By <@${timeoutResult.executor.id}>\n`;
                } else {
                    changes.push(`-# Timeout Removed`);
                    if (timeoutResult.executor) executorText = `> -# Removed By <@${timeoutResult.executor.id}>\n`;
                }
            }

            if (pendingChanged) {
                changes.push(`-# Verification Completed membership screening`);
            }

            if (changes.length === 0) return;

            const now = Math.floor(Date.now() / 1000);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('-# Member Updated')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `> -# When <t:${now}:F> • <t:${now}:R>\n` +
                                `> -# User <@${newMember.id}> - ID \`${newMember.id}\`\n` +
                                executorText +
                                `${changes.join('\n')}\n` +
                                `> -# Server ID \`${newMember.guild.id}\``
                            )
                        )
                   );

            logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
        });

        client.on('guildMemberAdd', async (member) => {
            const logChannel = await getLogChannel(client, member.guild.id, 'memberLogs', 'user');
            if (!logChannel) return;

            const accountAge = Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24));
            const now = Math.floor(Date.now() / 1000);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('-# Member Joined')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `> -# When <t:${now}:F> • <t:${now}:R>\n` +
                                `> -# User <@${member.id}> - ID \`${member.id}\`\n` +
                                `> -# Account Created <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n` +
                                `> -# Server ID \`${member.guild.id}\``
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                        )
                );

            logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
        });

        client.on('guildBanAdd', async (ban) => {
            const logChannel = await getLogChannel(client, ban.guild.id, 'moderationLogs', 'user');
            if (!logChannel) return;

            const { executor, reason } = await fetchAuditLogExecutor(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);
            const executorText = executor ? `-# Banned By <@${executor.id}>\n` : '';
            const banReason = reason || ban.reason || 'No reason provided';
            const now = Math.floor(Date.now() / 1000);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('-# Member Banned')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `> -# When <t:${now}:F> • <t:${now}:R>\n` +
                                `> -# User <@${ban.user.id}> - ID \`${ban.user.id}\`\n` +
                                executorText +
                                `> -# Reason ${banReason}\n` +
                                `> -# Server ID \`${ban.guild.id}\``
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(ban.user.displayAvatarURL({ dynamic: true, size: 256 }))
                        )
                );

            logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
        });

        client.on('guildBanRemove', async (ban) => {
            const logChannel = await getLogChannel(client, ban.guild.id, 'moderationLogs', 'user');
            if (!logChannel) return;

            const { executor, reason } = await fetchAuditLogExecutor(ban.guild, AuditLogEvent.MemberBanRemove, ban.user.id);
            const executorText = executor ? `-# Unbanned By <@${executor.id}>\n` : '';
            const unbanReason = reason ? `-# Reason ${reason}\n` : '';
            const now = Math.floor(Date.now() / 1000);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('-# Member Unbanned')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `> -# When <t:${now}:F> • <t:${now}:R>\n` +
                                `> -# User <@${ban.user.id}> - ID \`${ban.user.id}\`\n` +
                                executorText +
                                unbanReason +
                                `> -# Server ID \`${ban.guild.id}\``
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(ban.user.displayAvatarURL({ dynamic: true, size: 256 }))
                        )
                );

            logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
        });

        client.on('guildMemberRemove', async (member) => {
            const { executor: kickExecutor, reason: kickReason } = await fetchAuditLogExecutor(member.guild, AuditLogEvent.MemberKick, member.id);
            const isKick = kickExecutor !== null;

            const logChannel = await getLogChannel(client, member.guild.id, isKick ? 'moderationLogs' : 'memberLogs', 'user');
            if (!logChannel) return;

            const roles = member.roles.cache.filter(r => r.id !== member.guild.id).map(r => r.name);
            const now = Math.floor(Date.now() / 1000);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(isKick ? '-# Member Kicked' : '-# Member Left')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `> -# When <t:${now}:F> • <t:${now}:R>\n` +
                                `> -# User <@${member.id}> - ID \`${member.id}\`\n` +
                                (isKick ? `> -# Kicked By <@${kickExecutor.id}>\n` : '') +
                                (isKick && kickReason ? `-# Reason ${kickReason}\n` : '') +
                                `> -# Joined <t:${Math.floor(member.joinedTimestamp / 1000)}:R>\n` +
                                `> -# Roles ${roles.length > 0 ? roles.slice(0, 10).join(', ') + (roles.length > 10 ? ` +${roles.length - 10} more` : '') : 'None'}\n` +
                                `> -# Server ID \`${member.guild.id}\``
                            )
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                        )
                );

            logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
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