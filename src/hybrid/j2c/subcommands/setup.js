// © Author:  
// https://discord.gg/wwv

const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
    ChannelType,
    ActionRowBuilder,
    ChannelSelectMenuBuilder
} = require('discord.js');
const { J2CConfig } = require('../../../data/models');
const VoiceControlView = require('../../../lib/j2cView');
const emojis = require('../../../emojis.json');

module.exports = {
    name: 'setup',
    description: 'Setup the Join to Create system',

    async execute(interactionOrMessage, args = []) {
        const member = interactionOrMessage.member;
        const guild = interactionOrMessage.guild;

        if (!member.permissions.has('Administrator')) {
            const container = new ContainerBuilder() 
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('You need Administrator permission to use this command.')
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        const existing = await J2CConfig.findOne({ where: { guildId: guild.id } });
        if (existing?.voiceChannelId) {
            const container = new ContainerBuilder() 
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('-# Already Configured'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('> -#  Use `j2c config` to modify or `j2c reset` to start over.'));
            return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        const container = new ContainerBuilder() 
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('-# Join to Create Setup\n-# Step 1 of 3')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('-# Select the **text channel** where the control panel will be posted:')
            )
            .addActionRowComponents(
                new ActionRowBuilder()
                    .addComponents(
                        new ChannelSelectMenuBuilder()
                            .setCustomId('j2c_setup_text')
                            .setPlaceholder('Select control panel text channel')
                            .setChannelTypes(ChannelType.GuildText)
                    )
            );

        await interactionOrMessage.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
    },

    async sendControlPanel(textChannel) {
        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('-# **VoiceMaster Panel**')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `> -# ${emojis.j2c_lock} [\`Lock\`](${emojis.j2c_lock_link || 'https://.bot'}) - Deny members from joining\n` +
                    `> -# ${emojis.j2c_unlock} [\`Unlock\`](${emojis.j2c_unlock_link || 'https://.bot'}) - Allow members to join\n` +
                    `> -# ${emojis.j2c_hide} [\`Hide\`](${emojis.j2c_hide_link || 'https://.bot'}) - Hide from channel list\n` +
                    `> -# ${emojis.j2c_unhide} [\`Unhide\`](${emojis.j2c_unhide_link || 'https://.bot'}) - Show in channel list\n` +
                    `> -# ${emojis.j2c_claim} [\`Claim\`](${emojis.j2c_claim_link || 'https://.bot'}) - Take ownership\n` +
                    `> -# ${emojis.j2c_disconnect} [\`Disconnect\`](${emojis.j2c_disconnect_link || 'https://.bot'}) - Disconnect member\n` +
                    `> -# ${emojis.j2c_activity} [\`Activity\`](${emojis.j2c_activity_link || 'https://.bot'}) - View activities\n` +
                    `> -# ${emojis.j2c_info} [\`Information\`](${emojis.j2c_info_link || 'https://.bot'}) - View details\n` +
                    `> -# ${emojis.j2c_increase} [\`Increase Limit\`](${emojis.j2c_increase_link || 'https://.bot'}) - Increase limit\n` +
                    `> -# ${emojis.j2c_decrease} [\`Decrease Limit\`](${emojis.j2c_decrease_link || 'https://.bot'}) - Decrease limit`
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addActionRowComponents(...VoiceControlView.getComponents());

        await textChannel.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2
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