// © Author:  
// https://discord.gg/wwv

const { Events } = require('discord.js');
const lvl = require('../data/leveling');
const { handleVoiceStart, handleVoiceEnd } = require('../lib/levelingRuntime');

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState, client) {
        const member = newState.member;
        if (!member || member.user.bot) return;
        const guildId = newState.guild.id;

        const enabled = await lvl.isSystemEnabled(guildId).catch(() => false);
        if (!enabled) return;

        if (!oldState.channelId && newState.channelId) {
            await handleVoiceStart(member.id, guildId, newState.channelId);
        } else if (oldState.channelId && !newState.channelId) {
            await handleVoiceEnd(member.id, guildId);
        } else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
            await handleVoiceEnd(member.id, guildId);
            await handleVoiceStart(member.id, guildId, newState.channelId);
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