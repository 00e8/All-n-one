// src/lib/levelingRuntime.js
const {
    ContainerBuilder,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    AttachmentBuilder,
    MessageFlags,
} = require('discord.js');
const lvl = require('../data/leveling');
const levelingService = require('./levelingService');
const { renderLevelCard } = require('./rankCard');
const emojis = require('../emojis.json');

const voiceSessions = new Map();

function sessionKey(userId, guildId) {
    return `${userId}:${guildId}`;
}

const DEFAULT_LEVEL_UP_MESSAGE = '{mention} leveled up to Level **{level}**';

function formatLevelUpMessage(template, { user, level, xp }) {
    const msg = (template && template.trim().length > 0) ? template : DEFAULT_LEVEL_UP_MESSAGE;
    return msg
        .replaceAll('{mention}', `<@${user.id}>`)
        .replaceAll('{username}', user.username)
        .replaceAll('{level}', String(level))
        .replaceAll('{xp}', String(xp));
}

async function sendLevelUp(client, fallbackChannel, user, guildId, newLevel) {
    const settings = await lvl.getGuildSettings(guildId);
    if (settings?.level_up_enabled === 0) return;

    const profile = await levelingService.getProfile(user.id, guildId);
    if (!profile) return;

    const guild = client.guilds.cache.get(guildId);
    let member = null;
    if (guild) member = await guild.members.fetch(user.id).catch(() => null);

    // profile.remainingXp from levelFromXp() is already the XP earned
    // *within* the current level (not XP left to reach the next one), so
    // it's used directly as the progress value.
    const xpInLevel = profile.remainingXp;

    const avatarURL =
        member?.displayAvatarURL({ size: 256, extension: 'png' }) ??
        user.displayAvatarURL({ size: 256, extension: 'png' });

    const buffer = await renderLevelCard({
        avatarURL,
        username: user.username,
        level: newLevel,
        xpInLevel,
        xpForNext: profile.xpForNext,
        backgroundURL: settings?.level_up_background,
        title: 'LEVEL UP',
        formatXP: levelingService.formatXP,
    });
    const attachment = new AttachmentBuilder(buffer, { name: 'levelup.png' });

    const levelUpLine = formatLevelUpMessage(settings?.level_up_message, {
        user,
        level: newLevel,
        xp: levelingService.formatXP(profile.xp),
    });

    const container = new ContainerBuilder()
        .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL('attachment://levelup.png')
            )
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `> - -# Rank ${emojis.trophy || ''} ${levelingService.ordinal(profile.rank)}\n` +
                `> - -# ${levelUpLine}\n` +
                `> - -# XP ${levelingService.formatXP(xpInLevel)} / ${levelingService.formatXP(profile.xpForNext)}\n` +
                `> - -# ${levelingService.progressBar(xpInLevel, profile.xpForNext, 14)}`
            )
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `> - -# Total XP ${levelingService.formatXP(profile.xp)}\n` +
                `> - -# Messages ${profile.messages}\n` +
                `> - -# Voice ${levelingService.formatDuration(profile.voice_secs)}`
            )
        );

    const payload = {
        components: [container],
        files: [attachment],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { users: [user.id] },
    };

    try {
        if (settings?.level_up_dm) await user.send(payload).catch(() => {});
        const targetChannel = guild?.channels.cache.get(settings?.level_up_channel) ?? fallbackChannel;
        if (targetChannel) await targetChannel.send(payload).catch(() => {});
    } catch (err) {
        console.error(`[Leveling] Level up delivery failed ${err.message}`);
    }
}

async function handleVoiceStart(userId, guildId, channelId, joinedAt = lvl.nowTs()) {
    voiceSessions.set(sessionKey(userId, guildId), { joinedAt, channelId });
    await lvl.voiceJoin(userId, guildId, channelId, joinedAt);
}

async function handleVoiceEnd(userId, guildId, leftAt = lvl.nowTs()) {
    const key = sessionKey(userId, guildId);
    const session = voiceSessions.get(key);
    if (!session) return;

    const durationSecs = Math.max(0, leftAt - session.joinedAt);
    const durationMins = Math.floor(durationSecs / 60);

    await lvl.voiceLeave(userId, guildId, leftAt, durationMins, durationSecs);
    voiceSessions.delete(key);
    await levelingService.addVoiceXP(userId, guildId, durationSecs);
}

module.exports = { sendLevelUp, handleVoiceStart, handleVoiceEnd, voiceSessions, sessionKey };