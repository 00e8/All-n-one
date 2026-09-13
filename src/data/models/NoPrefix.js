// © Author:  
// https://discord.gg/wwv

const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');
const BaseModel = require('../BaseModel');
const cacheBus = require('../cacheBus');

const _noPrefixCache = new Map();
const NO_PREFIX_CACHE_TTL = 30000;

// Belt-and-suspenders: any write to this model (from anywhere) clears the
// cache instantly via BaseModel's generic hooks, instead of relying only
// on call sites remembering to call invalidateCache() themselves.
cacheBus.on('invalidate:NoPrefix', ({ userId }) => {
    if (userId) _noPrefixCache.delete(userId);
});

class NoPrefix extends BaseModel {
    static init(sequelize) {
        super.init(
            {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                userId: { type: DataTypes.STRING, allowNull: false, unique: true },
                username: { type: DataTypes.STRING, allowNull: false },
                grantedBy: { type: DataTypes.STRING, allowNull: false },
                grantedByUsername: { type: DataTypes.STRING, allowNull: false },
                expiresAt: { type: DataTypes.DATE, allowNull: true },
                duration: { type: DataTypes.STRING, allowNull: false },
            },
            {
                sequelize,
                modelName: 'NoPrefix',
                tableName: 'no_prefix',
                timestamps: true,
            }
        );

        return this;
    }

    static invalidateCache(userId) {
        _noPrefixCache.delete(userId);
    }

    static async isNoPrefixUser(userId) {
        const cached = _noPrefixCache.get(userId);
        if (cached && Date.now() - cached.ts < NO_PREFIX_CACHE_TTL) return cached.val;

        const record = await this.findOne({ where: { userId } });
        if (!record) {
            _noPrefixCache.set(userId, { val: false, ts: Date.now() });
            return false;
        }

        if (record.expiresAt && new Date() > new Date(record.expiresAt)) {
            await record.destroy();
            _noPrefixCache.set(userId, { val: false, ts: Date.now() });
            return false;
        }

        _noPrefixCache.set(userId, { val: true, ts: Date.now() });
        return true;
    }
}

module.exports = NoPrefix;

 

/**
 * Project: hana
 * Author: nunu.58 (shutup)
 * Organization: HYZEX Development
 * GitHub: https://github.com/ 
 * License: Custom
 * © 2026 HYZEX Development. All rights reserved.
 */