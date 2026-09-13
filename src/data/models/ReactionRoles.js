const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');
const cacheBus = require('../cacheBus');

const ReactionRoles = sequelize.define('ReactionRoles', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  guildId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: 'unique_guild_message'
  },
  messageId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: 'unique_guild_message'
  },
  channelId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  embedTitle: {
    type: DataTypes.STRING,
    defaultValue: 'Reaction Roles'
  },
  embedDescription: {
    type: DataTypes.TEXT,
    defaultValue: 'React to get a role!'
  },
  embedColor: {
    type: DataTypes.INTEGER,
    defaultValue: 5793266 // Default blue
  },
  embedThumbnailUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  emojiRolePairs: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array of {emoji, roleId, roleLabel} objects'
  },
  enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'ReactionRoles',
  timestamps: true
});

module.exports = ReactionRoles;

// Apply reaction-role add/edit/remove changes immediately instead of
// waiting up to CACHE_TTL (30s) for the stale cached config to expire.
const emit = (instance) => {
  if (!instance) return;
  cacheBus.emit('invalidate:ReactionRoles', { messageId: instance.messageId, guildId: instance.guildId });
};
ReactionRoles.addHook('afterSave', 'cacheBusInvalidate', emit);
ReactionRoles.addHook('afterDestroy', 'cacheBusInvalidate', emit);
ReactionRoles.addHook('afterBulkDestroy', 'cacheBusInvalidate', (options) => {
  const where = options?.where || {};
  cacheBus.emit('invalidate:ReactionRoles', { messageId: where.messageId, guildId: where.guildId });
});

/**
 * Project: hana
 * Author: nunu.58 (shutup)
 * Organization: HYZEX Development
 * GitHub: https://github.com/ 
 * License: Custom
 * © 2026 HYZEX Development. All rights reserved.
 */