// © Author:
// https://discord.gg/wwv
//
// Bridge layer: adapts the music command modules (ported as-is from the
// other bot, in ./commands/Music and ./commands/Config) to this bot's
// hybrid command shape ({ data, name, aliases, execute, autocomplete }).
//
// Nothing in the ported command files themselves is modified beyond a
// couple of unavoidable alias/name tweaks to prevent collisions with
// commands this bot already has (see MUSIC_PORT_NOTES.md).

const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const config = require('../config');

function applyOption(optBuilder, opt) {
    optBuilder.setName(opt.name).setDescription(opt.description || 'No description provided');
    if (opt.required) optBuilder.setRequired(true);
    if (opt.autocomplete) optBuilder.setAutocomplete(true);
    if (Array.isArray(opt.choices) && optBuilder.addChoices) {
        optBuilder.addChoices(...opt.choices.map(c => ({ name: c.name, value: c.value })));
    }
    return optBuilder;
}

function addOptionToBuilder(builder, opt) {
    switch (opt.type) {
        case 3: // STRING
            builder.addStringOption(o => applyOption(o, opt));
            break;
        case 4: // INTEGER
            builder.addIntegerOption(o => applyOption(o, opt));
            break;
        case 5: // BOOLEAN
            builder.addBooleanOption(o => applyOption(o, opt));
            break;
        case 6: // USER
            builder.addUserOption(o => applyOption(o, opt));
            break;
        case 7: // CHANNEL
            builder.addChannelOption(o => applyOption(o, opt));
            break;
        case 10: // NUMBER
            builder.addNumberOption(o => applyOption(o, opt));
            break;
        default:
            break;
    }
}

function buildData(cmd) {
    const builder = new SlashCommandBuilder()
        .setName(cmd.name)
        .setDescription((cmd.description || 'No description provided').slice(0, 100));

    const opts = cmd.slashOptions || [];
    const hasSubcommands = opts.some(o => o.type === 1);

    if (hasSubcommands) {
        for (const sub of opts) {
            if (sub.type !== 1) continue;
            builder.addSubcommand(sc => {
                sc.setName(sub.name).setDescription(sub.description || 'No description provided');
                (sub.options || []).forEach(o => addOptionToBuilder(sc, o));
                return sc;
            });
        }
    } else {
        opts.forEach(o => addOptionToBuilder(builder, o));
    }

    return builder;
}

function isInteraction(ctx) {
    return typeof ctx.isChatInputCommand === 'function' || typeof ctx.commandName === 'string';
}

function isOwner(userId) {
    return userId === config.OWNER_ID;
}

// Mirrors the pre-checks the original bot performed centrally before
// handing off to a command's slashExecute/execute (rank system aside,
// this bot has no equivalent so it's skipped).
async function runGuards(cmd, ctx, client, replyFn) {
    if (cmd.owner && !isOwner(ctx.author?.id || ctx.user?.id)) return false;

    if (cmd.botPerms && ctx.guild?.members?.me) {
        if (!ctx.guild.members.me.permissions.has(PermissionsBitField.resolve(cmd.botPerms || []))) {
            await replyFn(`-# I need the \`${cmd.botPerms.join(', ')}\` permission to run \`${cmd.name}\`.`);
            return false;
        }
    }

    if (cmd.userPerms && !isOwner(ctx.author?.id || ctx.user?.id)) {
        const member = ctx.member;
        if (member && !member.permissions.has(PermissionsBitField.resolve(cmd.userPerms || []))) {
            await replyFn(`-# You need the \`${cmd.userPerms.join(', ')}\` permission to run \`${cmd.name}\`.`);
            return false;
        }
    }

    const guildId = ctx.guild?.id;
    const player = guildId ? client.manager?.players?.get(guildId) : null;

    if (cmd.player && !player) {
        await replyFn(`-# There is no active player in this server.`);
        return false;
    }

    const voiceChannel = ctx.member?.voice?.channel;
    if (cmd.inVoiceChannel && !voiceChannel) {
        await replyFn(`-# You must be in a voice channel.`);
        return false;
    }

    if (cmd.sameVoiceChannel && player && voiceChannel && voiceChannel.id !== player.voiceId) {
        await replyFn(`-# You must be in the same voice channel as me.`);
        return false;
    }

    return true;
}

module.exports = function wrapMusicCommand(original) {
    const wrapped = {
        data: buildData(original),
        name: original.name,
        aliases: Array.isArray(original.aliases) ? original.aliases : [],
        cooldown: original.cooldown,

        async execute(ctx, args) {
            const client = ctx.client;

            const replyFn = async (text) => {
                const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
                const payload = { components: [container], flags: MessageFlags.IsComponentsV2 };
                try {
                    if (isInteraction(ctx)) {
                        if (ctx.deferred || ctx.replied) return await ctx.editReply(payload).catch(() => {});
                        return await ctx.reply(payload).catch(() => {});
                    }
                    return await ctx.reply(payload).catch(() => ctx.channel?.send(payload).catch(() => {}));
                } catch (_) {}
            };

            if (isInteraction(ctx)) {
                const ok = await runGuards(original, ctx, client, replyFn);
                if (!ok) return;
                return original.slashExecute(ctx, client);
            } else {
                const ok = await runGuards(original, ctx, client, replyFn);
                if (!ok) return;
                const prefix = client.prefix || config.PREFIX || ',';
                return original.execute(ctx, args || [], client, prefix);
            }
        },
    };

    if (typeof original.autocomplete === 'function') {
        wrapped.autocomplete = async function (interaction) {
            return original.autocomplete(interaction, interaction.client);
        };
    }

    return wrapped;
};
