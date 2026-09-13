// © Author:  
// https://discord.gg/wwv

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SectionBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ThumbnailBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  MessageFlags,
} = require('discord.js');
const emojis = require('../../../emojis.json');
const crypto = require('crypto');

let snipeData = new Map(); 
let editSnipeData = new Map(); 

module.exports = {
  snipeData,
  editSnipeData,

  data: new SlashCommandBuilder()
    .setName('general')
    .setDescription('General utility commands')
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Shows the status of a user in detail')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to check status for')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('avatar')
        .setDescription('Get the avatar of a user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to get avatar for')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('banner')
        .setDescription('Get the banner of a user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to get banner for')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('servericon')
        .setDescription('Get the server icon')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('membercount')
        .setDescription('Shows the member count of the server')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('urban')
        .setDescription('Search for word definition from dictionary')
        .addStringOption(option =>
          option.setName('word')
            .setDescription('The word to search for')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('hash')
        .setDescription('Hash text with various algorithms')
        .addStringOption(option =>
          option.setName('algorithm')
            .setDescription('The hashing algorithm to use')
            .setRequired(true)
            .addChoices(
              { name: 'MD5', value: 'md5' },
              { name: 'SHA1', value: 'sha1' },
              { name: 'SHA224', value: 'sha224' },
              { name: 'SHA256', value: 'sha256' },
              { name: 'SHA384', value: 'sha384' },
              { name: 'SHA512', value: 'sha512' },
              { name: 'All', value: 'all' }
            )
        )
        .addStringOption(option =>
          option.setName('text')
            .setDescription('The text to hash')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('snipe')
        .setDescription('View the last deleted message in the channel')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('editsnipe')
        .setDescription('View the last edited message in the channel')
    ),

  cooldown: 5,

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'status':
        await this.handleStatus(interaction);
        break;
      case 'avatar':
        await this.handleAvatar(interaction);
        break;
      case 'banner':
        await this.handleBanner(interaction);
        break;
      case 'servericon':
        await this.handleServerIcon(interaction);
        break;
      case 'membercount':
        await this.handleMemberCount(interaction);
        break;
      case 'poll':
        await this.handlePoll(interaction);
        break;
      case 'urban':
        await this.handleUrban(interaction);
        break;
      case 'hash':
        await this.handleHash(interaction);
        break;
      case 'snipe':
        await this.handleSnipe(interaction);
        break;
      case 'editsnipe':
        await this.handleEditSnipe(interaction);
        break;
    }
  },

  async handleStatus(interaction) {
    await interaction.deferReply();

    const user = interaction.options.getUser('user') || interaction.user;
    const member = interaction.guild.members.cache.get(user.id);

    const statusEmoji = {
      'online': 'Online',
      'idle': 'Idle',
      'dnd': 'Do Not Disturb',
      'offline': 'Offline'
    };

    const container = new ContainerBuilder();

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# ${user.displayName}'s Status`)
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    if (member) {
      const presence = member.presence;
      const status = statusEmoji[presence?.status || 'offline'];
      const avatarUrl = user.displayAvatarURL({ size: 256 });

      let platforms = [];
      if (presence?.clientStatus) {
        if (presence.clientStatus.desktop) platforms.push('Desktop');
        if (presence.clientStatus.mobile) platforms.push('Mobile');
        if (presence.clientStatus.web) platforms.push('Browser');
      }
      const platform = platforms.length > 0 ? platforms.join(', ') : 'None (Offline)';

      let statusContent = `-# Status ${status}\n-# Platform ${platform}`;

      const customStatus = presence?.activities.find(a => a.type === 4);
      if (customStatus) {
        const emoji = customStatus.emoji ? `${customStatus.emoji} ` : '';
        const text = customStatus.state || '';
        if (emoji || text) {
          statusContent += `\n-# Custom Status ${emoji}${text}`;
        }
      }

      container.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(statusContent)
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(avatarUrl)
          )
      );

      const activities = presence?.activities.filter(a => a.type !== 4) || [];
      if (activities.length > 0) {
        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );

        const activityTexts = activities.map(activity => {
          if (activity.type === 0) return `Playing ${activity.name}`;
          if (activity.type === 1) return `Streaming ${activity.name}`;
          if (activity.type === 2) return `Listening to ${activity.name}`;
          if (activity.type === 3) return `Watching ${activity.name}`;
          if (activity.type === 5) return `Competing in ${activity.name}`;
          return activity.name;
        }).join('\n');

        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# Activity\n${activityTexts}`)
        );
      }
    } else {
      const avatarUrl = user.displayAvatarURL({ size: 256 });
      container.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# Status Offline\n-# User ID ${user.id}`)
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(avatarUrl)
          )
      );
    }

    await interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },

  async handleAvatar(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = interaction.guild ? await interaction.guild.members.fetch(user.id).catch(() => null) : null;

    const avatarOptions = (hash) => ({
      extension: hash?.startsWith('a_') ? 'gif' : 'png',
      forceStatic: false,
      size: 4096
    });

    const globalAvatar = user.displayAvatarURL(avatarOptions(user.avatar));
    const guildAvatar = member?.avatar
      ? member.displayAvatarURL(avatarOptions(member.avatar))
      : null;

    const buildContainer = (imageUrl, isGuild = false) => {
      const container = new ContainerBuilder();

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`-# ${user.displayName}'s Avatar`)
      );
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );

      const mediaGallery = new MediaGalleryBuilder()
        .addItems(
          new MediaGalleryItemBuilder()
            .setURL(imageUrl)
            .setDescription(`${user.displayName}'s Avatar`)
        );

      container.addMediaGalleryComponents(mediaGallery);

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );

      const buttonRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('avatar_global')
            .setLabel('A')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(!isGuild ? true : false),
          new ButtonBuilder()
            .setCustomId('avatar_guild')
            .setLabel('S')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(isGuild ? true : !guildAvatar)
        );

      container.addActionRowComponents(buttonRow);
      return container;
    };

    const initialAvatar = globalAvatar;
    const initialIsGuild = false;

    const msg = await interaction.reply({
      components: [buildContainer(initialAvatar, initialIsGuild)],
      flags: MessageFlags.IsComponentsV2,
      fetchReply: true
    });

    const collector = msg.createMessageComponentCollector({
      filter: i => i.user.id === interaction.user.id,
      time: 60000
    });

    collector.on('collect', async i => {
      if (i.customId === 'avatar_global') {
        await i.update({
          components: [buildContainer(globalAvatar, false)],
          flags: MessageFlags.IsComponentsV2
        });
      }

      if (i.customId === 'avatar_guild' && guildAvatar) {
        await i.update({
          components: [buildContainer(guildAvatar, true)],
          flags: MessageFlags.IsComponentsV2
        });
      }
    });
  },

  async handleBanner(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = interaction.guild ? await interaction.guild.members.fetch(user.id).catch(() => null) : null;

    const fetchedUser = await interaction.client.users.fetch(user.id, { force: true }).catch(() => null);
    if (!fetchedUser) {
      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# Failed to fetch user data.`)
        );
      return await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const globalBanner = fetchedUser.bannerURL({ extension: 'png', size: 4096 });
    const guildBanner = member?.banner 
      ? member.bannerURL({ extension: 'png', size: 4096 }) 
      : null;

    if (!globalBanner && !guildBanner) {
      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# ${user.displayName} doesn't have a banner set.`)
        );

      return await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const buildContainer = (imageUrl, isGuild = false) => {
      const container = new ContainerBuilder();

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`-# ${user.displayName}'s Banner`)
      );
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );

      const mediaGallery = new MediaGalleryBuilder()
        .addItems(
          new MediaGalleryItemBuilder()
            .setURL(imageUrl)
            .setDescription(`${user.displayName}'s Banner`)
        );

      container.addMediaGalleryComponents(mediaGallery);

      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );

      const buttonRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('banner_global')
            .setLabel('A')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(!isGuild ? true : false),
          new ButtonBuilder()
            .setCustomId('banner_guild')
            .setLabel('S')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(isGuild ? true : !guildBanner)
        );

      container.addActionRowComponents(buttonRow);
      return container;
    };

    const initialBanner = globalBanner || guildBanner;
    const initialIsGuild = !globalBanner && !!guildBanner;

    const msg = await interaction.reply({
      components: [buildContainer(initialBanner, initialIsGuild)],
      flags: MessageFlags.IsComponentsV2,
      fetchReply: true
    });

    const collector = msg.createMessageComponentCollector({
      filter: i => i.user.id === interaction.user.id,
      time: 60000
    });

    collector.on('collect', async i => {
      if (i.customId === 'banner_global' && globalBanner) {
        await i.update({
          components: [buildContainer(globalBanner, false)],
          flags: MessageFlags.IsComponentsV2
        });
      }

      if (i.customId === 'banner_guild' && guildBanner) {
        await i.update({
          components: [buildContainer(guildBanner, true)],
          flags: MessageFlags.IsComponentsV2
        });
      }
    });
  },

  async handleServerIcon(interaction) {
    await interaction.deferReply();

    const guild = interaction.guild;

    if (!guild) {
      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# Server Icon\n\nThis command can only be used in a server.`)
        );

      return await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (!guild.icon) {
      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# Server Icon\n\n${guild.name} doesn't have a server icon set.`)
        );

      return await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const container = new ContainerBuilder();

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# Server Icon`)
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    const jpgUrl = guild.iconURL({ extension: 'jpg', size: 4096 });
    const pngUrl = guild.iconURL({ extension: 'png', size: 4096 });

    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder()
          .setURL(guild.iconURL({ size: 1024 }))
          .setDescription('Server Icon')
      )
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    const buttonRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel('JPG')
          .setStyle(ButtonStyle.Link)
          .setURL(jpgUrl),
        new ButtonBuilder()
          .setLabel('PNG')
          .setStyle(ButtonStyle.Link)
          .setURL(pngUrl)
      );

    container.addActionRowComponents(buttonRow);

    await interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },

  async handleMemberCount(interaction) {
    await interaction.deferReply();

    const guild = interaction.guild;

    const container = new ContainerBuilder();

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# ${guild.name} Member Count`)
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    await guild.members.fetch();
    
    const bots = guild.members.cache.filter(m => m.user.bot).size;
    const humans = guild.members.cache.filter(m => !m.user.bot).size;

    const memberInfo = `-# Total Members ${guild.memberCount}\n-# Humans ${humans}\n-# Bots ${bots}`;

    if (guild.icon) {
      container.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(memberInfo)
          )
          .setThumbnailAccessory(new ThumbnailBuilder().setURL(guild.iconURL({ size: 256 })))
      );
    } else {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(memberInfo)
      );
    }

    await interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },

  async handleUrban(interaction) {
    await interaction.deferReply();

    const word = interaction.options.getString('word');

    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);

      if (response.status !== 200) {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# Dictionary\n\nNo definition found for ${word}\n\nTry searching for a different word or check your spelling.`)
          );

        return await interaction.editReply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# Dictionary\n\nNo definition found for ${word}\n\nTry searching for a different word or check your spelling.`)
          );

        return await interaction.editReply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const entry = data[0];
      const meanings = entry.meanings || [];

      if (meanings.length === 0) {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# Dictionary\n\nNo definition found for ${word}`)
          );

        return await interaction.editReply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const container = new ContainerBuilder();

      const phonetic = entry.phonetic || '';
      let titleText = `-# ${entry.word || word}`;
      if (phonetic) {
        titleText += ` *${phonetic}*`;
      }

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(titleText)
      );
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );

      const firstMeaning = meanings[0];
      const partOfSpeech = firstMeaning.partOfSpeech || 'Unknown';
      const definitions = firstMeaning.definitions || [];

      if (definitions.length > 0) {
        let definitionText = definitions[0].definition || 'No definition available';
        if (definitionText.length > 800) {
          definitionText = definitionText.substring(0, 800) + '...';
        }

        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# Definition (${partOfSpeech})\n${definitionText}`)
        );
        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );

        const example = definitions[0].example || '';
        if (example) {
          let exampleText = example;
          if (exampleText.length > 600) {
            exampleText = exampleText.substring(0, 600) + '...';
          }
          container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# Example\n*"${exampleText}"*`)
          );
          container.addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
          );
        }
      }

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`-# *Definitions from authoritative dictionary sources*`)
      );

      await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# Dictionary Error\n\nFailed to fetch definition for ${word}\n\nPlease try again later or search for a different word.`)
        );

      await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  },

  async handleHash(interaction) {
    await interaction.deferReply();

    const algorithm = interaction.options.getString('algorithm');
    const text = interaction.options.getString('text');

    const algorithms = {
      'md5': crypto.createHash('md5').update(text).digest('hex'),
      'sha1': crypto.createHash('sha1').update(text).digest('hex'),
      'sha224': crypto.createHash('sha224').update(text).digest('hex'),
      'sha256': crypto.createHash('sha256').update(text).digest('hex'),
      'sha384': crypto.createHash('sha384').update(text).digest('hex'),
      'sha512': crypto.createHash('sha512').update(text).digest('hex'),
    };

    const container = new ContainerBuilder();

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# Hash Generator`)
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    const inputPreview = text.length > 50 ? text.substring(0, 50) + '...' : text;
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# Input Text ${inputPreview}\n-# Length ${text.length} characters`)
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    if (algorithm === 'all') {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`-# All Available Hash Algorithms`)
      );
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );

      for (const [algo, hash] of Object.entries(algorithms)) {
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# ${algo.toUpperCase()}\n\`\`\`${hash}\`\`\``)
        );
      }
    } else {
      const hash = algorithms[algorithm];
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`-# Algorithm ${algorithm.toUpperCase()}\n-# Hash\n\`\`\`${hash}\`\`\``)
      );
    }

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# Security Note These hashes are for verification and educational purposes`)
    );

    await interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },

  async handleSnipe(interaction) {
    await interaction.deferReply();

    const { createPaginationSession } = require('../../../lib/pagination');
    const channelSnipes = snipeData.get(interaction.channel.id) || [];

    if (channelSnipes.length === 0) {
      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# Message Snipe`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# No recently deleted messages found in this channel.`)
        );

      return await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const paginationSession = createPaginationSession({
      interactionOrMessage: interaction,
      pages: channelSnipes,
      renderPage: (pageIndex, snipe) => {
        const container = new ContainerBuilder();

        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# Snipe messages`)
        );
        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );

        const authorInfo = `-# Author <@${snipe.author_id}>`;
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(authorInfo)
        );

        const sentAt = `-# Sent at <t:${snipe.deleted_at}:F>`;
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(sentAt)
        );

        const content = snipe.content || 'No text content';
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# __Message Content__\n\`\`\`${content}\`\`\``)
        );

        if (snipe.attachments && snipe.attachments.length > 0) {
          const attachmentLinks = snipe.attachments.map(att => `[${att.name}](${att.url})`).join('\n');
          container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# Attachments\n-# ${attachmentLinks}`)
          );
        }

        if (channelSnipes.length > 1) {
          container.addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
          );
        }

        return container;
      },
      userId: interaction.user.id,
      timeout: 300000
    });

    await paginationSession.renderInitial();
  },

  async handleEditSnipe(interaction) {
    await interaction.deferReply();

    const { createPaginationSession } = require('../../../lib/pagination');
    const channelEditSnipes = editSnipeData.get(interaction.channel.id) || [];

    if (channelEditSnipes.length === 0) {
      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# Message Edit Snipe`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# No recently edited messages found in this channel.`)
        );

      return await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const paginationSession = createPaginationSession({
      interactionOrMessage: interaction,
      pages: channelEditSnipes,
      renderPage: (pageIndex, editSnipe) => {
        const container = new ContainerBuilder();

        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# Snipe messages`)
        );
        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );

        const authorInfo = `-# Author <@${editSnipe.author_id}>`;
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(authorInfo)
        );

        const editedAt = `-# Edited at <t:${editSnipe.edited_at}:F>`;
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(editedAt)
        );

        const contentBefore = editSnipe.content_before || 'No text content';
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# __Message Content__\n\`\`\`${contentBefore}\`\`\``)
        );

        if (editSnipe.attachments_before && editSnipe.attachments_before.length > 0) {
          const attachmentLinks = editSnipe.attachments_before.map(att => `[${att.name}](${att.url})`).join('\n');
          container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# Attachments\n-# ${attachmentLinks}`)
          );
        }

        if (channelEditSnipes.length > 1) {
          container.addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
          );
        }

        return container;
      },
      userId: interaction.user.id,
      timeout: 300000
    });

    await paginationSession.renderInitial();
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