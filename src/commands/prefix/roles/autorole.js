const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
    PermissionFlagsBits,
} = require('discord.js');

const emojis = require('../../../emojis.json');
const config = require('../../../config');
const { GuildPrefix } = require('../../../data/models');

const sep = () =>
    new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small);

const send = (message, text) =>
    message.channel.send({
        components: [
            new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(text)
            ),
        ],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { 
            parse: [], 
            roles: [] 
        },
    });

const DANGEROUS_PERMISSIONS = [
    PermissionFlagsBits.Administrator,
    PermissionFlagsBits.BanMembers,
    PermissionFlagsBits.KickMembers,
    PermissionFlagsBits.ManageGuild,
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.ManageRoles,
    PermissionFlagsBits.ManageWebhooks,
    PermissionFlagsBits.MentionEveryone,
];

module.exports = {
    name: 'autorole',
    aliases: ['ar'],
    description: 'Automatically assign roles to new members',
    category: 'premium',
    cooldown: 5,

    execute: async (message, args) => {
        const client = message.client;

        const tick = emojis.tick || emojis.success;
        const cross = emojis.cross || emojis.error;
        const arrow = emojis.arrow;
        const enabled = emojis.enabled;
        const disabled = emojis.disabled;

        const prefix =
            (await GuildPrefix.getPrefix(message.guild.id)) ||
            config.PREFIX;

        if (!message.member.permissions.has('ManageRoles')) {
            return send(
                message,
                `-# ${cross} You need permission to use this command.`
            );
        }

        const subCommand = args[0]?.toLowerCase();

        const stored = client.db.autorole.get(message.guild.id);
        const storedSettings = stored?.roles;

        const currentSettings =
            storedSettings && !Array.isArray(storedSettings)
                ? storedSettings
                : {
                      enabled: false,
                      roles: Array.isArray(storedSettings)
                          ? storedSettings
                          : [],
                      botRoles: [],
                  };

        if (!Array.isArray(currentSettings.roles)) {
            currentSettings.roles = [];
        }

        if (!Array.isArray(currentSettings.botRoles)) {
            currentSettings.botRoles = [];
        }

        if (typeof currentSettings.enabled !== 'boolean') {
            currentSettings.enabled = false;
        }

        if (!subCommand) {
            const humanRoles =
                currentSettings.roles
                    .map(id => `<@&${id}>`)
                    .join(', ') || 'None';

            const botRoles =
                currentSettings.botRoles
                    .map(id => `<@&${id}>`)
                    .join(', ') || 'None';

            return message.channel.send({
                components: [
                    new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                '-# Auto Role'
                            )
                        )
                        .addSeparatorComponents(sep())
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `-# Status ${
                                    currentSettings.enabled
                                        ? `Enabled`
                                        : `Disabled`}\n` +
                                    `-# Human Roles ${humanRoles}\n` +
                                    `-# Bot Roles ${botRoles}`
                            )
                        )
                        .addSeparatorComponents(sep())
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `-# ${arrow} ${prefix}autorole enable — Enable autorole\n` +
                                    `-# ${arrow} ${prefix}autorole disable — Disable autorole\n` +
                                    `-# ${arrow} ${prefix}autorole add human | bot @role — Add a role\n` +
                                    `-# ${arrow} ${prefix}autorole remove human | bot @role — Remove a role\n` +
                                    `-# ${arrow} ${prefix}autorole clear — Clear all roles`
                            )
                        ),
                ],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: {
                    parse: [],
                    roles: [],
                },
            });
        }

        if (subCommand === 'enable') {
            if (currentSettings.enabled === true) {
                return send(
                    message,
                    `-# Auto Role is already enabled.`
                );
            }

            currentSettings.enabled = true;

            client.db.autorole.set(
                message.guild.id,
                currentSettings
            );

            return send(
                message,
                `-# Auto Role has been enabled.`
            );
        }

        if (subCommand === 'disable') {
            if (currentSettings.enabled === false) {
                return send(
                    message,
                    `-# Auto Role is already disabled.`
                );
            }

            currentSettings.enabled = false;

            client.db.autorole.set(
                message.guild.id,
                currentSettings
            );

            return send(
                message,
                `-# ${tick} Auto Role has been disabled.`
            );
        }

        if (subCommand === 'add') {
            const type = args[1]?.toLowerCase();

            const role =
                message.mentions.roles.first() ||
                message.guild.roles.cache.get(args[2]);

            if (!['human', 'bot'].includes(type)) {
                return send(
                    message,
                    `-# Type must be human or bot.`
                );
            }

            if (!role) {
                return send(
                    message,
                    `-# Please mention a valid role.`
                );
            }

            if (
                DANGEROUS_PERMISSIONS.some(permission =>
                    role.permissions.has(permission)
                )
            ) {
                return send(
                    message,
                    `-# I cannot add this role because it has dangerous permissions.`
                );
            }

            const botMember = message.guild.members.me;

            if (!botMember) {
                return send(
                    message,
                    `-# I cannot find my bot member in this server.`
                );
            }

            if (
                role.position >=
                botMember.roles.highest.position
            ) {
                return send(
                    message,
                    `-# I cannot assign this role as it is higher than my highest role.`
                );
            }

            const roleArray =
                type === 'human' ? 'roles' : 'botRoles';

            if (currentSettings[roleArray].includes(role.id)) {
                return send(
                    message,
                    `-# This role is already in the ${type} autorole list.`
                );
            }

            currentSettings[roleArray].push(role.id);

            client.db.autorole.set(
                message.guild.id,
                currentSettings
            );

            return send(
                message,
                `-# ${tick} Added ${role} to the ${type} autorole list.`
            );
        }

        if (subCommand === 'remove') {
            const type = args[1]?.toLowerCase();

            const role =
                message.mentions.roles.first() ||
                message.guild.roles.cache.get(args[2]);

            if (!['human', 'bot'].includes(type)) {
                return send(
                    message,
                    `-# Type must be human or bot.`
                );
            }

            if (!role) {
                return send(
                    message,
                    `-# Please mention a valid role.`
                );
            }

            const roleArray =
                type === 'human' ? 'roles' : 'botRoles';

            if (!currentSettings[roleArray].includes(role.id)) {
                return send(
                    message,
                    `-# This role is not in the ${type} autorole list.`
                );
            }

            currentSettings[roleArray] =
                currentSettings[roleArray].filter(
                    id => id !== role.id
                );

            client.db.autorole.set(
                message.guild.id,
                currentSettings
            );

            return send(
                message,
                `-# ${tick} Removed ${role} from the ${type} autorole list.`
            );
        }

        if (subCommand === 'clear') {
            client.db.autorole.set(
                message.guild.id,
                {
                    enabled: false,
                    roles: [],
                    botRoles: [],
                }
            );

            return send(
                message,
                `-# ${tick} Cleared all autorole settings.`
            );
        }

        return send(
            message,
            `-# ${cross} Unknown Auto Role command. Use ${prefix}autorole to see the available commands.`
        );
    },
};