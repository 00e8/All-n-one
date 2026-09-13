// © Author:
// https://discord.gg/wwv
//
// Builds a unified context object from either a slash command
// interaction or a prefix message, so the ticket command logic (all
// of it originally written against a single context shape) doesn't
// need to branch on isSlash everywhere it touches user/guild/channel.

class TicketContext {
    constructor({ client, message, interaction, args }) {
        this.client = client;
        this.message = message || null;
        this.interaction = interaction || null;
        this.args = args || [];
        this.isSlash = !!interaction;
        this.isPrefix = !!message;
    }

    get user() { return this.isSlash ? this.interaction.user : this.message.author; }
    get author() { return this.isSlash ? this.interaction.user : this.message.author; }
    get member() { return this.isSlash ? this.interaction.member : this.message.member; }
    get guild() { return this.isSlash ? this.interaction.guild : this.message.guild; }
    get channel() { return this.isSlash ? this.interaction.channel : this.message.channel; }

    async reply(options) {
        if (this.isSlash) {
            if (this.interaction.deferred) return this.interaction.editReply(options);
            return this.interaction.reply(options);
        }
        this._replyMessage = await this.message.reply(options);
        return this._replyMessage;
    }

    async editReply(options) {
        if (this.isSlash) return this.interaction.editReply(options);
        if (!this._replyMessage) throw new Error('Cannot edit reply: no initial reply found');
        return this._replyMessage.edit(options);
    }

    async deferReply(options = {}) {
        if (this.isSlash) return this.interaction.deferReply(options);
        this._deferred = true;
    }

    async followUp(options) {
        if (this.isSlash) return this.interaction.followUp(options);
        return this.message.channel.send(options);
    }
}

function buildContext(interactionOrMessage, args = []) {
    const isSlash = typeof interactionOrMessage.isChatInputCommand === 'function' && interactionOrMessage.isChatInputCommand();
    if (isSlash) {
        return new TicketContext({ client: interactionOrMessage.client, interaction: interactionOrMessage, args: [] });
    }
    return new TicketContext({ client: interactionOrMessage.client, message: interactionOrMessage, args });
}

/** Minimal ctx-shaped object built straight from a raw component interaction
 * (button/select click), for reuse of checkTicketPermission() outside a
 * full slash/prefix invocation. */
function pseudoCtx(interaction) {
    return { guild: interaction.guild, member: interaction.member, author: interaction.user };
}

module.exports = { TicketContext, buildContext, pseudoCtx };

/**
 * Project: hana
 * Author: nunu.58 (shutup)
 * Organization: HYZEX Development
 * GitHub: https://github.com/
 * License: Custom
 * © 2026 HYZEX Development. All rights reserved.
 */
