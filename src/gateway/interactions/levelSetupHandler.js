// © Author:  
// https://discord.gg/wwv

const {
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
} = require('discord.js');
const lvl = require('../../data/leveling');
const emojis = require('../../emojis.json');
const {
    DEFAULT_MESSAGE,
    buildMainPanel,
    buildChannelPanel,
    buildMessagePanel,
    buildImagePanel,
    buildXpPanel,
    buildRewardsPanel,
} = require('../../lib/levelSetupPanel');

function notice(text) {
    return {
        components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${text}`))],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true,
    };
}

async function handle(interaction) {
    const id = interaction.customId;
    if (!id || !id.startsWith('lvlsetup_')) return false;

    const guildId = interaction.guild?.id;
    if (!guildId) return false;

    // ---------- buttons ----------
    if (interaction.isButton()) {
        if (id === 'lvlsetup_close') {
            const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('-# Leveling setup closed'));
            await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
            return true;
        }

        if (id === 'lvlsetup_back') {
            await interaction.update(await buildMainPanel(guildId));
            return true;
        }

        if (id === 'lvlsetup_toggle') {
            const s = await lvl.getGuildSettings(guildId);
            await lvl.patchGuildSettings(guildId, 'level_up_enabled', s.level_up_enabled ? 0 : 1);
            await interaction.update(await buildMainPanel(guildId));
            return true;
        }

        if (id === 'lvlsetup_menu_channel') {
            await interaction.update(await buildChannelPanel(guildId));
            return true;
        }

        if (id === 'lvlsetup_menu_message') {
            await interaction.update(await buildMessagePanel(guildId));
            return true;
        }

        if (id === 'lvlsetup_menu_image') {
            await interaction.update(await buildImagePanel(guildId));
            return true;
        }

        if (id === 'lvlsetup_menu_xp') {
            await interaction.update(await buildXpPanel(guildId));
            return true;
        }

        if (id === 'lvlsetup_menu_rewards') {
            await interaction.update(await buildRewardsPanel(guildId));
            return true;
        }

        if (id === 'lvlsetup_dm_toggle') {
            const s = await lvl.getGuildSettings(guildId);
            await lvl.patchGuildSettings(guildId, 'level_up_dm', s.level_up_dm ? 0 : 1);
            await interaction.update(await buildChannelPanel(guildId));
            return true;
        }

        if (id === 'lvlsetup_channel_reset') {
            await lvl.patchGuildSettings(guildId, 'level_up_channel', null);
            await interaction.update(await buildChannelPanel(guildId));
            return true;
        }

        if (id === 'lvlsetup_msg_default') {
            await lvl.patchGuildSettings(guildId, 'level_up_message', DEFAULT_MESSAGE);
            await interaction.update(await buildMessagePanel(guildId));
            return true;
        }

        if (id === 'lvlsetup_msg_edit') {
            const s = await lvl.getGuildSettings(guildId);
            const modal = new ModalBuilder().setCustomId('lvlsetup_msg_modal').setTitle('Level-up Message');
            const input = new TextInputBuilder()
                .setCustomId('msg_input')
                .setLabel('Message (use {mention} {level} {xp})')
                .setStyle(TextInputStyle.Paragraph)
                .setValue(s.level_up_message ?? DEFAULT_MESSAGE)
                .setMaxLength(500)
                .setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await interaction.showModal(modal);
            return true;
        }

        if (id === 'lvlsetup_img_default') {
            await lvl.patchGuildSettings(guildId, 'level_up_background', null);
            await interaction.update(await buildImagePanel(guildId));
            return true;
        }

        if (id === 'lvlsetup_img_url') {
            const s = await lvl.getGuildSettings(guildId);
            const modal = new ModalBuilder().setCustomId('lvlsetup_img_modal').setTitle('Level-up Background');
            const input = new TextInputBuilder()
                .setCustomId('img_input')
                .setLabel('Direct image URL (png, jpg, gif, webp)')
                .setStyle(TextInputStyle.Short)
                .setValue(s.level_up_background ?? '')
                .setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await interaction.showModal(modal);
            return true;
        }

        if (id === 'lvlsetup_xp_edit') {
            const s = await lvl.getGuildSettings(guildId);
            const modal = new ModalBuilder().setCustomId('lvlsetup_xp_modal').setTitle('XP Range & Cooldown');
            const min = new TextInputBuilder().setCustomId('xp_min_input').setLabel('Minimum XP per message').setStyle(TextInputStyle.Short).setValue(String(s.xp_min)).setRequired(true);
            const max = new TextInputBuilder().setCustomId('xp_max_input').setLabel('Maximum XP per message').setStyle(TextInputStyle.Short).setValue(String(s.xp_max)).setRequired(true);
            const cd = new TextInputBuilder().setCustomId('xp_cd_input').setLabel('Cooldown between messages (seconds)').setStyle(TextInputStyle.Short).setValue(String(s.xp_cooldown_secs)).setRequired(true);
            modal.addComponents(
                new ActionRowBuilder().addComponents(min),
                new ActionRowBuilder().addComponents(max),
                new ActionRowBuilder().addComponents(cd)
            );
            await interaction.showModal(modal);
            return true;
        }

        if (id === 'lvlsetup_voice_rate') {
            const s = await lvl.getGuildSettings(guildId);
            const modal = new ModalBuilder().setCustomId('lvlsetup_voice_modal').setTitle('Voice XP Rate');
            const rate = new TextInputBuilder().setCustomId('voice_rate_input').setLabel('XP per minute in voice').setStyle(TextInputStyle.Short).setValue(String(s.voice_xp_per_min)).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(rate));
            await interaction.showModal(modal);
            return true;
        }

        if (id === 'lvlsetup_voice_toggle') {
            const s = await lvl.getGuildSettings(guildId);
            await lvl.patchGuildSettings(guildId, 'voice_xp_enabled', s.voice_xp_enabled ? 0 : 1);
            await interaction.update(await buildXpPanel(guildId));
            return true;
        }

        if (id === 'lvlsetup_stack_toggle') {
            const s = await lvl.getGuildSettings(guildId);
            await lvl.patchGuildSettings(guildId, 'stack_rewards', s.stack_rewards ? 0 : 1);
            await interaction.update(await buildXpPanel(guildId));
            return true;
        }

        return false;
    }

    if (interaction.isChannelSelectMenu() && id === 'lvlsetup_channel_select') {
        const channel = interaction.channels.first();
        await lvl.patchGuildSettings(guildId, 'level_up_channel', channel ? channel.id : null);
        await interaction.update(await buildChannelPanel(guildId));
        return true;
    }

    if (interaction.isRoleSelectMenu() && id === 'lvlsetup_reward_role_select') {
        const role = interaction.roles.first();
        if (!role) return true;

        const modal = new ModalBuilder().setCustomId(`lvlsetup_reward_level_modal_${role.id}`).setTitle(`Reward: ${role.name}`.slice(0, 45));
        const input = new TextInputBuilder()
            .setCustomId('reward_level_input')
            .setLabel('Level required (1-1000)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
        return true;
    }

    if (interaction.isStringSelectMenu() && id === 'lvlsetup_reward_remove_select') {
        const [levelStr, roleId] = interaction.values[0].split(':');
        await lvl.removeReward(guildId, parseInt(levelStr), roleId);
        await interaction.update(await buildRewardsPanel(guildId));
        return true;
    }

    if (interaction.isModalSubmit()) {
        if (id === 'lvlsetup_msg_modal') {
            await interaction.deferUpdate();
            const message = interaction.fields.getTextInputValue('msg_input');
            await lvl.patchGuildSettings(guildId, 'level_up_message', message);
            await interaction.editReply(await buildMessagePanel(guildId));
            return true;
        }

        if (id === 'lvlsetup_img_modal') {
            const url = interaction.fields.getTextInputValue('img_input').trim();
            if (!/^https?:\/\/.+\.(png|jpe?g|gif|webp)(\?.*)?$/i.test(url)) {
                await interaction.reply(notice(`${emojis.error} That doesn't look like a valid direct image URL`));
                return true;
            }
            await interaction.deferUpdate();
            await lvl.patchGuildSettings(guildId, 'level_up_background', url);
            await interaction.editReply(await buildImagePanel(guildId));
            return true;
        }

        if (id === 'lvlsetup_xp_modal') {
            const min = parseInt(interaction.fields.getTextInputValue('xp_min_input'));
            const max = parseInt(interaction.fields.getTextInputValue('xp_max_input'));
            const cd = parseInt(interaction.fields.getTextInputValue('xp_cd_input'));

            if (isNaN(min) || isNaN(max) || isNaN(cd) || min < 0 || max < min || cd < 0) {
                await interaction.reply(notice(`${emojis.error} Enter valid numbers (min \u2264 max, cooldown \u2265 0)`));
                return true;
            }

            await interaction.deferUpdate();
            await lvl.patchGuildSettings(guildId, 'xp_min', min);
            await lvl.patchGuildSettings(guildId, 'xp_max', max);
            await lvl.patchGuildSettings(guildId, 'xp_cooldown_secs', cd);
            await interaction.editReply(await buildXpPanel(guildId));
            return true;
        }

        if (id === 'lvlsetup_voice_modal') {
            const rate = parseInt(interaction.fields.getTextInputValue('voice_rate_input'));
            if (isNaN(rate) || rate < 0) {
                await interaction.reply(notice(`${emojis.error} Enter a valid non-negative number`));
                return true;
            }
            await interaction.deferUpdate();
            await lvl.patchGuildSettings(guildId, 'voice_xp_per_min', rate);
            await interaction.editReply(await buildXpPanel(guildId));
            return true;
        }

        if (id.startsWith('lvlsetup_reward_level_modal_')) {
            const roleId = id.replace('lvlsetup_reward_level_modal_', '');
            const level = parseInt(interaction.fields.getTextInputValue('reward_level_input'));

            if (isNaN(level) || level < 1 || level > 1000) {
                await interaction.reply(notice(`${emojis.error} Level must be a number between 1 and 1000`));
                return true;
            }

            await interaction.deferUpdate();
            await lvl.addReward(guildId, level, roleId);
            await interaction.editReply(await buildRewardsPanel(guildId));
            return true;
        }
    }

    return false;
}

module.exports = { handle };

/**
 * Project: hana
 * Author: nunu.58 (shutup)
 * Organization: HYZEX Development
 * GitHub: https://github.com/ 
 * License: Custom
 * © 2026 HYZEX Development. All rights reserved.
 */
