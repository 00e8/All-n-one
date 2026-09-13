// © Author:  
// https://discord.gg/wwv

const { Events } = require('discord.js');
const { J2CConfig, TempChannel } = require('../data/models');
const cacheBus = require('../data/cacheBus');

const j2cConfigCache = new Map();
const J2C_CACHE_TTL = 60000;

// Apply `/j2c` changes immediately instead of waiting up to J2C_CACHE_TTL
// for the stale cached config to expire.
cacheBus.on('invalidate:J2CConfig', ({ guildId }) => {
    if (guildId) j2cConfigCache.delete(guildId);
});

async function getJ2CConfig(guildId) {
    const cached = j2cConfigCache.get(guildId);
    if (cached && Date.now() - cached.ts < J2C_CACHE_TTL) return cached.val;
    const config = await J2CConfig.findOne({ where: { guildId }, raw: true });
    j2cConfigCache.set(guildId, { val: config, ts: Date.now() });
    return config;
}

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        const client = newState.client || oldState.client;
        const guild = newState.guild;
        const member = newState.member;

        if (!member?.user?.bot) {
            const guildId = guild.id;
            const config = await getJ2CConfig(guildId);

            if (config) {
                if (newState.channel && newState.channel.id === config.voiceChannelId) {
                    const category = guild.channels.cache.get(config.categoryId);
                    if (category) {
                        try {
                            const newVC = await guild.channels.create({
                                name: `${member.displayName}`,
                                type: 2,
                                parent: category.id,
                                reason: 'Join to Create'
                            });

                            await TempChannel.create({
                                channelId: newVC.id,
                                guildId: guildId,
                                ownerId: member.id
                            });

                            await member.voice.setChannel(newVC);
                        } catch (error) {
                            console.error('Error creating temp VC:', error);
                        }
                    }
                }

                if (oldState.channel) {
                    const channelId = oldState.channel.id;
                    const tempChannel = await TempChannel.findOne({
                        where: {
                            guildId: guildId,
                            channelId: channelId
                        },
                        raw: true
                    });

                    if (tempChannel) {
                        try {
                            const channel = guild.channels.cache.get(channelId);
                            if (!channel || channel.members.size === 0) {
                                if (channel) {
                                    await channel.delete('Temporary VC is empty').catch(() => {});
                                }
                                await TempChannel.destroy({
                                    where: { channelId: channelId }
                                });
                            }
                        } catch (error) {
                            console.error('Error deleting temp VC:', error);
                        }
                    }
                }
            }
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