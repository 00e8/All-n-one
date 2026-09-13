// © Author:  
// https://discord.gg/wwv

/**
 * Database Models Index
 * Initializes all models and sets up associations
 */

const sequelize = require('../sequelize');
const NoPrefix = require('./NoPrefix');
const AFK = require('./AFK');
const J2CConfig = require('./J2CConfig');
const TempChannel = require('./TempChannel');
const Todo = require('./Todo');
const GuildPrefix = require('./GuildPrefix');
const Blacklist = require('./Blacklist');
const LoggingConfig = require('./LoggingConfig');
const WelcomeConfig = require('./WelcomeConfig');
const FarewellConfig = require('./FarewellConfig');
const Profile = require('./Profile');
const AutoReact = require('./AutoReact');
const AntinukeConfig = require('./AntinukeConfig');
const AntinukeWhitelist = require('./AntinukeWhitelist');
const AutomodConfig = require('./AutomodConfig');
const AutomodWhitelist = require('./AutomodWhitelist');
const GuildConfig = require('./GuildConfig');
const ModLog = require('./ModLog');
const Favorite = require('./Favorite');
const Playlist = require('./Playlist');
const PlaylistTrack = require('./PlaylistTrack');
const Giveaway = require('./Giveaway');
const GiveawayEntry = require('./GiveawayEntry');
const ReactionRoles = require('./ReactionRoles');


// Initialize all models
NoPrefix.init(sequelize);
AFK.init(sequelize);
J2CConfig.init(sequelize);
TempChannel.init(sequelize);
Todo.init(sequelize);
GuildPrefix.init(sequelize);
Blacklist.init(sequelize);
LoggingConfig.init(sequelize);
WelcomeConfig.init(sequelize);
FarewellConfig.init(sequelize);
Profile.init(sequelize);
AutoReact.init(sequelize);
AntinukeConfig.init(sequelize);
AntinukeWhitelist.init(sequelize);
AutomodConfig.init(sequelize);
AutomodWhitelist.init(sequelize);
GuildConfig.init(sequelize);
ModLog.init(sequelize);
Favorite.init(sequelize);
Playlist.init(sequelize);
PlaylistTrack.init(sequelize);
Giveaway.init(sequelize);
GiveawayEntry.init(sequelize);

const models = {
    NoPrefix,
    AFK,
    J2CConfig,
    TempChannel,
    Todo,
    GuildPrefix,
    Blacklist,
    LoggingConfig,
    WelcomeConfig,
    FarewellConfig,
    Profile,
    AutoReact,
    AntinukeConfig,
    AntinukeWhitelist,
    AutomodConfig,
    AutomodWhitelist,
    GuildConfig,
    ModLog,
    Favorite,
    Playlist,
    PlaylistTrack,
    Giveaway,
    GiveawayEntry,
    ReactionRoles,
    sequelize
};

Object.values(models).forEach(model => {
    if (model.associate && typeof model.associate === 'function') {
        model.associate(models);
    }
});

async function safeAddIndex(qi, table, fields, options = {}) {
    try {
        await qi.addIndex(table, fields, options);
    } catch (e) {
        const msg = e.message || '';
        if (msg.includes('already exists') || e.original?.code === '42P07' || e.original?.code === '42701') return;
        throw e;
    }
}

const dbReady = sequelize.sync()
    .then(async () => {
        const qi = sequelize.getQueryInterface();

        await Promise.all([
            safeAddIndex(qi, 'giveaways',       ['ended', 'endTime'],          { name: 'giveaways_ended_endtime' }),
            safeAddIndex(qi, 'giveaways',       ['guildId'],                   { name: 'giveaways_guild_id' }),
            safeAddIndex(qi, 'giveaway_entries',['giveawayId'],                { name: 'giveaway_entries_giveaway_id' }),
            safeAddIndex(qi, 'giveaway_entries',['giveawayId', 'userId'],      { name: 'giveaway_entries_giveaway_user', unique: true }),
            safeAddIndex(qi, 'auto_react',      ['guildId'],                   { name: 'auto_react_guild_id' }),
        ]);

        return true;
    })
    .catch((err) => {
        console.error('Database sync error:', err.message);
        throw err;
    });

models.dbReady = dbReady;

module.exports = models;

 

/**
 * Project: hana
 * Author: nunu.58 (shutup)
 * Organization: HYZEX Development
 * GitHub: https://github.com/ 
 * License: Custom
 * © 2026 HYZEX Development. All rights reserved.
 */