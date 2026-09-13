// © Author:
// https://discord.gg/wwv
//
// Shared Components V2 builders for simple one-off command responses
// (errors, success confirmations, plain info messages).
//
// Most hybrid commands only need a title + a body of text wrapped in a
// Container. Before this file, every command defined its own local
// `errorContainer(text)` (or similar) from scratch, which meant ~100+
// near-identical copies scattered across src/hybrid/**. Use these helpers
// for new commands, and swap old ones over whenever you're already
// touching that file — no need for a big-bang rewrite.
//
// Usage:
//   const { buildErrorContainer, buildSuccessContainer, buildInfoContainer } = require('../../lib/uiHelpers');
//   return interaction.reply({
//     components: [buildErrorContainer('Steal Emojis', '> You need the **Manage Expressions** permission.')],
//     flags: MessageFlags.IsComponentsV2
//   });

const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize
} = require('discord.js');

function buildContainer(title, text, { footer } = {}) {
    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**${title}**`)
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(text)
        );

    if (footer) {
        container
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${footer}`));
    }

    return container;
}

// text is prefixed with a light "> " quote style to match the existing
// error containers used across the codebase (e.g. steal.js).
const buildErrorContainer = (title, text, opts) => buildContainer(title, text.startsWith('>') ? text : `> ${text}`, opts);
const buildSuccessContainer = (title, text, opts) => buildContainer(title, text, opts);
const buildInfoContainer = (title, text, opts) => buildContainer(title, text, opts);

module.exports = { buildContainer, buildErrorContainer, buildSuccessContainer, buildInfoContainer };

/**
 * Project: hana
 * Author: nunu.58 (shutup)
 * Organization: HYZEX Development
 * GitHub: https://github.com/
 * License: Custom
 * © 2026 HYZEX Development. All rights reserved.
 */
