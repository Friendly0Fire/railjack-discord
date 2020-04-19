'use strict';

// Load libraries
const fs = require('fs');
const path = require('path');
const Discord = require('discord.js');
const Commando = require('discord.js-commando');
const sqlite = require('sqlite');
const { WarframeProfileManager } = require('./utils/profile');

// Load settings
let config = {};
{
    let rawConfig = fs.readFileSync('config.json');
    config = JSON.parse(rawConfig);

    if(!config.token) {
        console.error('No token found, cannot proceed.');
        return;
    }
}

const client = new Commando.Client({
    'owner': config.owner || ''
});

// Commando configuration
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

// Profile Manager initialization
const profileManager = new WarframeProfileManager(path.join(__dirname, 'profiles.db'));
profileManager.setupClient(client);

client.on('ready', () => {
    console.log('Bot initialized.');
});
client.on('error', console.error);

client.login(config.token);