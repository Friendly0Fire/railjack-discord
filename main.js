'use strict';

// Load libraries
const fs = require('fs');
const path = require('path');
const Discord = require('discord.js');
const Commando = require('discord.js-commando');
const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');
const bsqlite = require('better-sqlite3');
const { WarframeProfileManager } = require('./modules/profile');
const { WarframeGuildManager } = require('./modules/guild');
const { WarframeTracker } = require('./modules/tracking');
const { WarframeIntrinsicsManager } = require('./modules/intrinsics');
const FallbackCommand = require('./fallbackCommand.js');

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

config.dataPath = path.join(__dirname, "data/");

const client = new Commando.Client({
    'owner': config.owner || ''
});

// Commando configuration
client.registry
    .registerGroups([
        ['wf', 'Warframe-related commands']
    ])
    .registerDefaults()
    .registerCommandsIn(path.join(__dirname, 'commands'));
client.registry.unknownCommand = new FallbackCommand(client);

(async () => {
    const db = await sqlite.open({ filename: path.join(config.dataPath, 'settings.db'),
                                    driver: sqlite3.Database });
    client.setProvider(new Commando.SQLiteProvider(db));
})();

client.on('debug', x => console.log("Discord.js debug: " + indentedLog(x)));

// Profile Manager initialization
const db = bsqlite(path.join(config.dataPath, 'wf.db'), { verbose: x => console.log("SQL statement: " + indentedLog(x)) });
const profileManager = new WarframeProfileManager(db);
profileManager.setupClient(client);
const guildManager = new WarframeGuildManager(db);
guildManager.setupClient(client);
//const intrinsicsManager = new WarframeIntrinsicsManager(db);
//intrinsicsManager.setupClient(client);
//const tracker = new WarframeTracker(db);
//tracker.setupClient(client);

client.on('ready', () => {
    console.log('Bot initialized.');
});
client.on('error', console.error);

client.login(config.token);