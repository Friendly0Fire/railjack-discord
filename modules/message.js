'use strict';

// Load libraries
const uuid = require('uuid');
const axios = require('axios').default;
const cheerio = require('cheerio');
const misc = require('./misc');

class MessageManager {
    static instance = undefined;

    constructor(db) {
        if(MessageManager.instance != undefined)
            throw "Instance already exists!";

        this.db = db;
        this.db.prepare(`CREATE TABLE IF NOT EXISTS messages(
                            nickname TEXT,
                            guildId TEXT,
                            channelId TEXT DEFAULT "0",
                            content TEXT DEFAULT "",
                            orderIndex INTEGER DEFAULT 0)`).run();

        MessageManager.instance = this;
    }

    setupClient(client) { }

    getMessagesIn(guildId, channelId) {
        const message = this.db.prepare("SELECT * FROM messages WHERE guildId=? AND channelId=? ORDER BY orderIndex ASC").all(guildId, channelId);

        return message;
    }

    getMessages(guildId) {
        const message = this.db.prepare("SELECT * FROM messages WHERE guildId=? ORDER BY channelId ASC, orderIndex ASC").all(guildId);

        return message;
    }

    getMessage(guildId, nickname) {
        const message = this.db.prepare("SELECT * FROM messages WHERE guildId=? AND nickname=?").get(guildId, nickname);
        if(message == undefined)
            return null;

        return message;
    }

    _createMessage(guildId, nickname) {
        this.db.prepare("INSERT INTO messages (guildId, nickname) VALUES (?, ?)").run(guildId, nickname);
    }

    setMessage(guildId, nickname, data) {
        if(this.getMessage(guildId, nickname) == null)
            this._createMessage(guildId, nickname);

        let query = "UPDATE messages SET ";
        let params = [];

        for(let [k, v] of Object.entries(data)) {
            query += `${k}=?, `;
            params.push(v);
        }

        if(params.length === 0)
            return;

        query = query.slice(0, -2) + " WHERE guildId=? AND nickname=?";
        params.push(guildId);
        params.push(nickname);

        let statement = this.db.prepare(query);
        statement.run.apply(statement, params);
    }
}

module.exports = { MessageManager };