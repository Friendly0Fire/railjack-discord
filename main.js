'use strict';

// Load libraries
const fs = require('fs');
const path = require('path');
const Discord = require('discord.js');
const Commando = require('discord.js-commando');
const sqlite = require('sqlite');
const bsqlite = require('better-sqlite3');
const { WarframeProfileManager } = require('./utils/profile');
const { WarframeGuildManager } = require('./utils/guild');
const { WarframeTracker } = require('./utils/tracking');

function indentedLog(txt) {
    return txt.split("\n").map((line, i) => {
        if(i > 0) {
            line = "    " + line;
        }
        return line;
    }).join("\n");
}

process.on('uncaughtException', function(error) {
    console.error(error);
    process.exit(1);
   });

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
const db = bsqlite(path.join(__dirname, 'wf.db'), { verbose: x => console.log("SQL statement: " + indentedLog(x)) });
const profileManager = new WarframeProfileManager(db);
profileManager.setupClient(client);
const guildManager = new WarframeGuildManager(db);
guildManager.setupClient(client);
const tracker = new WarframeTracker(db);
tracker.setupClient(client);

client.on('ready', () => {
    console.log('Bot initialized.');
});
client.on('error', console.error);

client.login(config.token);