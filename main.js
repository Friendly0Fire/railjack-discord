'use strict';

// Load libraries
const fs = require('fs');
const path = require('path');
const Discord = require('discord.js');
const Commando = require('discord.js-commando');
const sqlite = require('sqlite');
const { WarframeProfileManager } = require('./profile');

// Load settings
let config = {};
{
    let rawConfig = fs.readFileSync('config.json');
    config = JSON.parse(rawConfig);
}

if(!config.token) {
    console.error('No token found, cannot proceed.');
    return;
}

const profileManager = new WarframeProfileManager(path.join(__dirname, 'profiles.db'));

const client = new Commando.Client({
    'owner': config.owner || ''
});

client.on('ready', () => {
    console.log('Bot initialized.');
});

client.on('guildMemberAdd', async member => {
    await member.setNickname("❔" + member.displayName);
    const channel = member.guild.channels.cache.find(ch => ch.name === 'welcome');
    if(!channel) return;

    await channel.send(`Welcome to the server, ${member}`);
});

client.registry
    .registerGroups([
        ['wf', 'Warframe-related commands'],
        ['admin', 'Administrative commands']
    ])
    .registerDefaults()
    .registerCommandsIn(path.join(__dirname, 'commands'));

client.setProvider(
        sqlite.open(path.join(__dirname, 'settings.db')).then(db => new Commando.SQLiteProvider(db))
    ).catch(console.error);

client.login(config.token);