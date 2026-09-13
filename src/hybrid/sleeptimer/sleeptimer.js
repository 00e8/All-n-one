// © Author:
// https://discord.gg/wwv
//
// Ported music command (unmodified logic) from the other bot's codebase.
// See src/music/MUSIC_PORT_NOTES.md for details on what changed and why.

const original = require('../../music/commands/Music/sleeptimer.js');
const wrapMusicCommand = require('../../music/hybridAdapter');

module.exports = wrapMusicCommand(original);
