'use strict';

// Load libraries
const fs = require('fs');
const path = require('path');
const sqlite = require('better-sqlite3');
const uuid = require('uuid');
const axios = require('axios').default;
const cheerio = require('cheerio');

class WarframeProfileManager {
    static instance = undefined;
    defaultVerifiedRole = "verified";
    defaultPlatform = "PC";

    constructor(dbName) {
        if(WarframeProfileManager.instance != undefined)
            throw "Instance already exists!";

        this.dbName = dbName || "./profiles.db";
        this.db = sqlite(this.dbName);
        this.db.prepare('CREATE TABLE IF NOT EXISTS profiles(userId TEXT PRIMARY KEY, token TEXT, platform TEXT, ign TEXT, verified INTEGER)').run();
        this.db.prepare('CREATE TABLE IF NOT EXISTS guilds(guildId TEXT PRIMARY KEY, verifiedRole TEXT DEFAULT ?, defaultPlatform TEXT DEFAULT ?)')
               .run(defaultVerifiedRole, defaultPlatform);

        WarframeProfileManager.instance = this;
    }

    generateToken(userId) {
        const priorEntry = this.db.prepare("SELECT token FROM profiles WHERE userId = ?").get(userId);
        if(priorEntry != undefined)
            return priorEntry.token;

        const token = uuid.v4();
        this.db.prepare("INSERT INTO profiles VALUES (?, ?, '', '', 0)").run(userId, token);

        return token;
    }

    setupClient(client) {
        client.on('guildMemberAdd', async member => {
            const userData = this.getUserData(member.user.id);
            await member.user.send(`Welcome to ${member.guild.name}, ${member}!`);

            if(userData.verified)
                this._applyVerificationSingle(userData, member.guild);
            else
                this._notifyUnverified(member);
        });

        client.on('guildCreate', async guild => {
            this.initializeGuildData(guild.id);
        });
    }

    async _loadProfilePage(profileUrl) {
        let ret = {};

        const response = await axios.get(`https://forums.warframe.com/profile/${profileUrl}/?tab=field_core_pfield_1&timestamp=${new Date().getTime()}`, {
            headers: {
                'Cache-Control': 'max-age=0',
                'Accept': 'text/html,application/xhtml+xml,application/xml'
            }
        });

        if(response.status !== 200)
            throw "Could not reach Warframe Forums, please try again later.";

        const $ = cheerio.load(response.data);
        ret.token = $("#elProfileTabs_content h2").next().text().trim();
        ret.username = $("#elProfileHeader .cProfileHeader_name h1").text().trim();
        if(ret.username.indexOf("(") != -1) {
            const platformEnd = ret.username.indexOf(")") - 1;
            ret.platform = ret.username.slice(1, platformEnd);
            ret.username = ret.username.slice(platformEnd + 1);
        } else
            ret.platform = "PC";

        return ret;
    }

    _stripUrl(profileUrl) {
        const profileIndex = profileUrl.indexOf("profile/");
        if(profileIndex != -1)
            profileUrl = profileUrl.slice(profileIndex + 8);

        return profileUrl.replace("/", "");
    }

    async verifyToken(userId, profileUrl) {
        const priorEntry = this.db.prepare("SELECT token FROM profiles WHERE userId = ?").get(userId);
        if(priorEntry == undefined)
            throw "No token found for user.";

        const pageResult = await this._loadProfilePage(this._stripUrl(profileUrl));

        if(pageResult.token.indexOf(priorEntry.token) == -1)
            throw "Token mismatch for user.";

        this.db.prepare("UPDATE profiles SET platform = ?, ign = ?, verified = 1 WHERE userId = ?").run(pageResult.platform, pageResult.username, userId);
    }

    getUserData(userId) {
        const priorEntry = this.db.prepare("SELECT * FROM profiles WHERE userId = ?").get(userId);
        if(priorEntry == undefined)
            throw "User does not exist!";

        return priorEntry;
    }

    async initializeGuildData(guildId, client) {
        this.db.prepare("INSERT INTO guilds VALUES (?)").run(guildId);

        const guild = client.guilds.get(guildId);

        const members = await guild.members.fetch();

        members.each(async member => {
            const userData = this.getUserData(member.user.id);
            if(userData.verified)
            await this._applyVerificationSingle(userData, guild);
            else
                await this._notifyUnverified(member);
        });
    }

    getGuildData(guildId) {
        const guildData = this.db.prepare("SELECT * FROM guilds WHERE guildId = ?").get(guildId);
        if(guildData == undefined)
            throw "Guild does not exist!";

        return guildData;
    }

    async _applyVerificationSingle(userData, guild) {
        if(!userData.verified)
            throw "User is not verified!";

        const member = guild.members.fetch(userId);
        const guildData = this.getGuildData(guid.id);

        let nick = userData.ign;
        if(userData.platform != guildData.defaultPlatform)
            nick += ` [${userData.platform}]`;
        await member.setNickname(nick);
        const verifiedRole = guild.roles.cache.find(ro => ro.name === guildData.verifiedRole);
        await member.roles.add(verifiedRole);
    }

    async applyVerification(userId, client) {
        const userData = this.getUserData(userId);

        client.guilds.cache.each(async guild => {
            this._applyVerificationSingle(userData, guild);
        });
    }

    async _notifyUnverified(member) {
        await member.setNickname(member.user.username + "❔");
        await member.user.send("You are currently unverified! To begin the verification process, please reply with `verify`");
    }
}

module.exports = { WarframeProfileManager };