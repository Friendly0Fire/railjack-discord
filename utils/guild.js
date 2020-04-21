'use strict';

const { WarframeProfileManager } = require('./profile');
const misc = require('./misc');

class WarframeGuildManager {
    static instance = undefined;
    defaultVerifiedRole = "verified";
    defaultPlatform = "pc";

    constructor(db) {
        if(WarframeGuildManager.instance != undefined)
            throw "Instance already exists!";

        this.db = db;
        this.db.prepare(`CREATE TABLE IF NOT EXISTS guilds(
                            guildId TEXT PRIMARY KEY,
                            verifiedRole TEXT DEFAULT "${this.defaultVerifiedRole}",
                            defaultPlatform TEXT DEFAULT "${this.defaultPlatform}",
                            pcRole TEXT DEFAULT "${misc.Platforms.pc}",
                            ps4Role TEXT DEFAULT "${misc.Platforms.ps4}",
                            xb1Role TEXT DEFAULT "${misc.Platforms.xb1}",
                            nswRole TEX DEFAULT "${misc.Platforms.nsw}")`).run();

        WarframeGuildManager.instance = this;
    }

    setupClient(client) {
        client.on('guildCreate', this.initializeGuildData);

        client.on('guildMemberAdd', async member => {
            const userData = WarframeProfileManager.instance.getUserData(member.user.id);
            await member.user.send(`Welcome to ${member.guild.name}, ${member}!`);

            this.applyVerificationSingle(userData, member.guild);

            if(!userData.verified)
                await member.user.send("It appears you have not been validated yet. Please respond with `verify` to begin!");
        });

        client.on('ready', async () => {
            await this.initGuilds(client.guilds.cache);
        });
    }

    async initializeGuildData(guild) {
        this.db.prepare("INSERT INTO guilds VALUES (?)").run(guild.id);

        const members = await guild.members.fetch();

        members.each(async member => {
            const userData = WarframeProfileManager.instance.getUserData(member.user.id);
            await this.applyVerificationSingle(userData, guild);
        });
    }

    getGuildData(guildId) {
        const guildData = this.db.prepare("SELECT * FROM guilds WHERE guildId = ?").get(guildId);
        if(guildData == undefined)
            return {
                guildId: guildId
            };

        return guildData;
    }

    setGuildData(guildId, data) {
        let query = "UPDATE guilds SET ";
        let params = [];

        for(let [k, v] of Object.entries(data)) {
            query += `${k}=? `;
            params.push(v);
        }

        if(params.length === 0)
            return;

        query += "WHERE guildId=?";
        params.push(guildId);

        this.db.prepare(query).run.apply(this, params);
    }

    async applyVerificationSingle(userData, guild) {
        const member = await guild.members.fetch(userData.userId);

        if(!member.manageable || member.user.bot)
            return;

        const guildData = this.getGuildData(guild.id);

        let nick = "";
        if(!userData.verified)
            nick = member.user.username + "❔";
        else {
            nick = userData.ign;

            if(userData.platform != guildData.defaultPlatform)
                nick += ` [${userData.platform}]`;
        }

        if(member.nickname != nick)
            await member.setNickname(nick);

        const roles = (await guild.roles.fetch()).cache;

        const verifiedRole = roles.get(guildData.verifiedRole);

        if(userData.verified) {
            let rolesToAdd = [];
            if(verifiedRole != undefined)
                rolesToAdd.push(verifiedRole);

            const platformRole = roles.get(guildData[userData.platform.toLowerCase() + "Role"]);
            if(platformRole != undefined)
                rolesToAdd.push(platformRole);

            await member.roles.add(rolesToAdd);
        } else {
            let rolesToRemove = [];
            if(verifiedRole != undefined)
            rolesToRemove.push(verifiedRole);

            for(let roleKey in ["pc", "ps4", "xb1", "nsw"]) {
                const platformRole = roles.get(guildData[roleKey + "Role"]);
                if(platformRole != undefined)
                    rolesToRemove.push(platformRole);
            }

            if(rolesToRemove.length > 0)
                await member.roles.remove(rolesToRemove);
        }
    }

    async applyVerification(userId, client) {
        const userData = WarframeProfileManager.instance.getUserData(userId);

        const guilds = await client.guilds.fetch();
        guilds.each(async guild => {
            await this.applyVerificationSingle(userData, guild);
        });
    }

    async refreshGuild(guild) {
        const members = await guild.members.fetch();

        members.each(async member => {
            const userData = WarframeProfileManager.instance.getUserData(member.user.id);
            await this.applyVerificationSingle(userData, guild);
        });
    }

    async initGuilds(guilds) {
        await guilds.each(this.refreshGuild.bind(this));
    }
}

module.exports = { WarframeGuildManager };