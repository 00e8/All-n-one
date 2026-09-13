// © Author:  
// https://discord.gg/wwv



const emojis = require('../../../emojis.json');
const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    SeparatorSpacingSize
} = require('discord.js');
const { deleteConfig, deleteGuildData, getConfig } = require('../../../data/vanityRoles');

module.exports = {
    async execute(interactionOrMessage, args = []) {
        try {
            const isSlashCommand = interactionOrMessage.isCommand && interactionOrMessage.isCommand();
            const guild = interactionOrMessage.guild;
            const userId = isSlashCommand ? interactionOrMessage.user.id : interactionOrMessage.author.id;

            const config = await getConfig(guild.id);

            if (!config) {
                const container = new ContainerBuilder() 
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent("-# Nothing to Reset\n-# Vanity roles are not setup for this server")
                    );
                
                return interactionOrMessage.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2,
                    ephemeral: true
                });
            }

            
            const confirmButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('reset_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('reset_confirm')
                    .setLabel('Delete All Data')
                    .setStyle(ButtonStyle.Danger)
            );

            const confirmContainer = new ContainerBuilder() 
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("Reset")
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        "-# This will delete\n" +
                        "> - -# Vanity role configuration\n" +
                        "> - -# All tracking data\n" +
                        "> - -# This action cannot be undone"
                    )
                )
                .addActionRowComponents(confirmButtons);

            const msg = await interactionOrMessage.reply({
                components: [confirmContainer],
                flags: MessageFlags.IsComponentsV2
            });

            
            const collector = msg.createMessageComponentCollector({
                filter: (interaction) => interaction.user.id === userId,
                time: 30000,
                max: 1
            });

            collector.on('collect', async (interaction) => {
                if (interaction.customId === 'reset_confirm') {
                    
                    await deleteConfig(guild.id);
                    await deleteGuildData(guild.id);

                    const successContainer = new ContainerBuilder() 
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`-# Reset Complete\n-# All vanity role data has been deleted`)
                        );

                    await interaction.update({
                        components: [successContainer],
                        flags: MessageFlags.IsComponentsV2
                    });
                } else if (interaction.customId === 'reset_cancel') {
                    const cancelContainer = new ContainerBuilder() 
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent("Reset cancelled")
                        );

                    await interaction.update({
                        components: [cancelContainer],
                        flags: MessageFlags.IsComponentsV2
                    });
                }
            });

            collector.on('end', () => {
                
            });

        } catch (error) {
            console.error('Reset command error:', error);
            const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
            const errorContainer = new ContainerBuilder() 
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("# Error\n-# Failed to reset vanity roles")
                );
            
            return interactionOrMessage.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
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