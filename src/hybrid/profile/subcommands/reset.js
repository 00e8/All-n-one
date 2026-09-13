// © Author:  
// https://discord.gg/wwv



const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags
} = require('discord.js');
const Profile = require('../../../data/models/Profile');
const emojis = require('../../../emojis.json');

module.exports = {
    async execute(interactionOrMessage, args = []) {
        const userId = interactionOrMessage.user?.id || interactionOrMessage.author.id;

        try {
            const reset = await Profile.resetProfile(userId);

            if (!reset) {
                const container = new ContainerBuilder() 
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`-# ${emojis.error} You don't have any profile data to reset.`)
                    );

                return interactionOrMessage.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const successContainer = new ContainerBuilder() 
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# ${emojis.check} Your profile has been reset. Description, socials, and background have been cleared.`)
                );

            await interactionOrMessage.reply({
                components: [successContainer],
                flags: MessageFlags.IsComponentsV2
            });
        } catch (error) {
            console.error('Profile reset error:', error);
            
            const errorContainer = new ContainerBuilder() 
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('# Database Error')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        '-# Failed to reset your profile. Please try again later.'
                    )
                );

            await interactionOrMessage.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
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