// © Author:  
// https://discord.gg/wwv

const { Model } = require('sequelize');
const cacheBus = require('./cacheBus');

class BaseModel extends Model {
    // Wraps Sequelize's Model.init so every model that extends BaseModel
    // automatically emits `invalidate:<ModelName>` right after a write,
    // letting gateway-side caches drop the stale entry immediately
    // instead of waiting for their TTL to expire.
    static init(attributes, options) {
        const model = super.init(attributes, options);

        // Collect every field referenced by CACHE_KEYS (e.g. [['guildId','targetId']])
        // so the invalidation payload carries whatever a cache actually keys on,
        // not just guildId/userId.
        const keyFields = new Set(['guildId', 'userId']);
        for (const combo of model.CACHE_KEYS || []) {
            for (const field of combo) keyFields.add(field);
        }

        const buildPayload = (source) => {
            const payload = {};
            for (const field of keyFields) payload[field] = source?.[field];
            return payload;
        };

        const emit = (instance) => {
            if (!instance) return;
            cacheBus.emit(`invalidate:${model.name}`, buildPayload(instance));
        };
        const emitFromWhere = (options) => {
            cacheBus.emit(`invalidate:${model.name}`, buildPayload(options?.where));
        };

        model.addHook('afterSave', 'cacheBusInvalidate', emit);
        model.addHook('afterDestroy', 'cacheBusInvalidate', emit);
        model.addHook('afterUpsert', 'cacheBusInvalidate', (result) => {
            emit(Array.isArray(result) ? result[0] : result);
        });
        model.addHook('afterBulkUpdate', 'cacheBusInvalidate', emitFromWhere);
        model.addHook('afterBulkDestroy', 'cacheBusInvalidate', emitFromWhere);

        return model;
    }

    static setupParentTouch(foreignKey, ParentModel, parentField = 'updatedAt') {
        const updateParent = async (instance) => {
            if (instance[foreignKey]) {
                await ParentModel.update(
                    { [parentField]: new Date() },
                    { where: { id: instance[foreignKey] } }
                );
            }
        };

        this.addHook('afterCreate', 'updateParentTimestamp', updateParent);
        this.addHook('afterUpdate', 'updateParentTimestamp', updateParent);
        this.addHook('afterDestroy', 'updateParentTimestamp', updateParent);
    }

    static CACHE_KEYS = [];
}

module.exports = BaseModel;

 

 

/**
 * Project: hana
 * Author: nunu.58 (shutup)
 * Organization: HYZEX Development
 * GitHub: https://github.com/ 
 * License: Custom
 * © 2026 HYZEX Development. All rights reserved.
 */