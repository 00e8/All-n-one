// © Author:  
// https://discord.gg/wwv

const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require('discord.js');
const config = require('../config');
const botLogger = require('../lib/botLogger');

module.exports = {
    name: 'guildCreate',

    async execute(guild, client) {
        botLogger.logGuildJoin(guild, client).catch(() => {});

        try {
            const owner = await guild.fetchOwner();
            if (!owner) return;

            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `-# Thanks for adding ${client.user.username} to ${guild.name}`
                    )
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `> -# You can report any issues at my [Support](${config.SUPPORT_SERVER}).\n> -# You can use \`/help\` or \`${config.PREFIX}help\` to explore everything I can do`
                    )
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
            await owner.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        } catch (error) {
            console.error('guildCreate DM error:', error.message);
        }
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