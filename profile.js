'use strict';

// Load libraries
const fs = require('fs');
const path = require('path');
const sqlite = require('better-sqlite3');
const uuid = require('uuid');
const axios = require('axios').default;
const cheerio = require('cheerio');

class WarframeProfileManager {
    constructor(dbName) {
        this.dbName = dbName || "./profiles.db";
        this.db = sqlite(this.dbName);
        this.db.prepare('CREATE TABLE IF NOT EXISTS profiles(userId TEXT PRIMARY KEY, token TEXT, platform TEXT, ign TEXT, verified INTEGER)').run();
    }

    generateToken(userId) {
        const priorEntry = this.db.prepare("SELECT token FROM profiles WHERE userId = ?").get(userId);
        if(priorEntry != undefined)
            return priorEntry.token;

        const token = uuid.v4();
        this.db.prepare("INSERT INTO profiles VALUES (?, ?, '', '', 0)").run(userId, token);

        return token;
    }

    async _loadProfilePage(profileUrl) {
        let ret = {};

        try {
            const response = await axios.get(`https://forums.warframe.com/profile/${profileUrl}/?tab=field_core_pfield_1&timestamp=${new Date().getTime()}`, {
                headers: {
                    'Cache-Control': 'max-age=0',
                    'Accept': 'text/html,application/xhtml+xml,application/xml'
                }
            });

            if(response.status !== 200)
                return { "status": false, "reason": "Could not reach Warframe Forums, please try again later." };

            const $ = cheerio.load(response.data);
            ret.token = $("#elProfileTabs_content h2").next().text().trim();
            ret.username = $("#elProfileHeader .cProfileHeader_name h1").text().trim();
            if(ret.username.indexOf("(") != -1) {
                const platformEnd = ret.username.indexOf(")") - 1;
                ret.platform = ret.username.slice(1, platformEnd);
                ret.username = ret.username.slice(platformEnd + 1);
            } else
                ret.platform = "PC";

        } catch(error) {
            return { "status": false, "reason": "Request error: " + error };
        }

        return ret;
    }

    async verifyToken(userId, profileUrl) {
        const priorEntry = this.db.prepare("SELECT token FROM profiles WHERE userId = ?").get(userId);
        if(priorEntry == undefined)
            return { "status": false, "reason": "No token found for user." };

        const pageResult = await this._loadProfilePage(profileUrl);
        if(pageResult.status === false)
            return pageResult;

        if(priorEntry.token != pageResult.token)
            return { "status": false, "reason": "Token mismatch for user." };

        this.db.prepare("UPDATE profiles SET platform = ?, ign = ?, verified = 1 WHERE userId = ?").run(pageResult.platform, pageResult.username, userId);

        return { "status": true };
    }
}

module.exports = { WarframeProfileManager };