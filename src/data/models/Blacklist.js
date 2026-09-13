// © Author:  
// https://discord.gg/wwv

const { DataTypes } = require('sequelize');
const cacheBus = require('../cacheBus');

const Blacklist = {
  name: 'Blacklist',

  init(sequelize) {
    this.model = sequelize.define('Blacklist', {
      type: {
        type: DataTypes.ENUM('user', 'guild'),
        allowNull: false,
        validate: {
          isIn: [['user', 'guild']]
        }
      },
      entityId: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      addedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    }, {
      timestamps: false,
      indexes: [
        {
          fields: ['type', 'entityId'],
          unique: true
        }
      ]
    });

    const emit = (instance) => {
      if (!instance) return;
      cacheBus.emit('invalidate:Blacklist', { type: instance.type, entityId: instance.entityId });
    };
    this.model.addHook('afterSave', 'cacheBusInvalidate', emit);
    this.model.addHook('afterDestroy', 'cacheBusInvalidate', emit);
    this.model.addHook('afterBulkDestroy', 'cacheBusInvalidate', (options) => {
      const where = options?.where || {};
      cacheBus.emit('invalidate:Blacklist', { type: where.type, entityId: where.entityId });
    });

    return this.model;
  },

  associate(models) {
    // No associations
  }
};

module.exports = Blacklist;

 

/**
 * Project: hana
 * Author: nunu.58 (shutup)
 * Organization: HYZEX Development
 * GitHub: https://github.com/ 
 * License: Custom
 * © 2026 HYZEX Development. All rights reserved.
 */