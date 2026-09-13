// © Author:  
// https://discord.gg/wwv



const fs = require('fs');
const path = require('path');

const subcommands = new Map();
const subcommandsPath = path.join(__dirname, 'list');

if (fs.existsSync(subcommandsPath)) {
  const subcommandFiles = fs.readdirSync(subcommandsPath).filter(file => file.endsWith('.js'));
  
  for (const file of subcommandFiles) {
    const filePath = path.join(subcommandsPath, file);
    const subcommand = require(filePath);
    if (subcommand.name && subcommand.execute) {
      subcommands.set(subcommand.name, subcommand);
    }
  }
}

module.exports = {
  name: 'list',
  description: 'List various server information',
  cooldown: 5,
  usage: 'list <subcommand>',
  category: 'general',
  
  async execute(message, args) {
    if (args.length === 0) {
      return message.reply('Please provide a subcommand. Available: `boosters`, `inrole`, `roles`, `emojis`, `bots`, `admins`, `invoice`, `mods`, `early`, `createpos`');
    }

    const subcommandName = args[0].toLowerCase();
    const subcommand = subcommands.get(subcommandName);

    if (!subcommand) {
      return message.reply(`Unknown subcommand '${subcommandName}'. Available: \`boosters\`, \`inrole\`, \`roles\`, \`emojis\`, \`bots\`, \`admins\`, \`invoice\`, \`mods\`, \`early\`, \`createpos\``);
    }

    try {
      await subcommand.execute(message, args.slice(1));
    } catch (error) {
      console.error(`Error executing list subcommand ${subcommandName}:`, error);
      await message.reply('There was an error executing this list command!');
    }
  }
};

/**
 * Project: hana
 * Author: nunu.58 (shutup)
 * Organization: HYZEX Development
 * GitHub: https://github.com/ 
 * License: Custom
 * © 2026 HYZEX Development. All rights reserved.
 */