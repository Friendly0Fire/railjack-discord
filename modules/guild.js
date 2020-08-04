'use strict';

const { WarframeProfileManager } = require('./profile');
const misc = require('./misc');

class WarframeGuildManager {
    static instance = undefined;
    defaultVerifiedRole = "verified";
    defaultPlatform = "";
    enableVerification = false;

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
                            nswRole TEXT DEFAULT "${misc.Platforms.nsw}",
                            enableVerification BOOLEAN DEFAULT ${this.enableVerification ? 1 : 0})`).run();

        WarframeGuildManager.instance = this;
    }

    setupClient(client) {
        client.on('guildCreate', () => this.initializeGuildData());

        client.on('guildMemberAdd', async member => {
            const userData = WarframeProfileManager.instance.getUserData(member.user.id);
            await member.user.send(`Welcome to ${member.guild.name}, ${member}!`);

            const guildData = this.getGuildData(member.guild.id);
            if(!guildData.enableVerification)
                return;

            this.applyVerificationSingle(userData, member.guild);

            if(!userData.verified)
                await member.user.send("It appears you have not been validated yet. Please respond with `verify` to begin!");
        });

        client.on('ready', async () => {
            await this.initGuilds(client.guilds.cache);
        });
    }

    async initializeGuildData(guild) {
        const guildData = this.db.prepare("SELECT * FROM guilds WHERE guildId = ?").get(guild.id);
        if(guildData == undefined)
            this.db.prepare("INSERT INTO guilds (guildId) VALUES (?)").run(guild.id);

        if(guildData == undefined || !guildData.enableVerification)
            return;

        const members = await guild.members.fetch();

        members.each(async member => {
            const userData = WarframeProfileManager.instance.getUserData(member.user.id);
            await this.applyVerificationSingle(userData, guild);
        });
    }

    getGuildLayout() {
        return this.db.prepare("PRAGMA table_info(guilds)").all();
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

        const layout = this.getGuildLayout();

        for(let [k, v] of Object.entries(data)) {
            if(layout.some((l) => l.name === k)) {
                query += `${k}=?, `;
                params.push(v);
            }
        }

        if(params.length === 0)
            return;

        query = query.slice(0, -2) + " WHERE guildId=?";
        params.push(guildId);

        let statement = this.db.prepare(query);
        statement.run.apply(statement, params);
    }

    appendNickname(nick, suffix) {
        if(nick.length + suffix.length > 32)
            return nick.substr(0, 32 - suffix.length - 1) + "…" + suffix;
        else
            return nick + suffix;
    }

    async applyVerificationSingle(userData, guild) {
        const member = await guild.members.fetch(userData.userId);

        if(!member.manageable || member.user.bot)
            return;

        const guildData = this.getGuildData(guild.id);
        if(!guildData.enableVerification)
            return;

        let nick = "";
        if(!userData.verified)
            nick = this.appendNickname(member.user.username, " ❔");
        else {
            nick = userData.ign;

            if(userData.platform != guildData.defaultPlatform)
                nick = this.appendNickname(nick, ` [${misc.PlatformsPrettyShort[userData.platform]}]`);
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

            console.log("Adding roles: " + rolesToAdd.map(x => x.name).join(", "));

            if(rolesToAdd.length > 0)
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

            console.log("Removing roles: " + rolesToRemove.map(x => x.name).join(", "));

            if(rolesToRemove.length > 0)
                await member.roles.remove(rolesToRemove);
        }
    }

    async applyVerification(userId, client) {
        const userData = WarframeProfileManager.instance.getUserData(userId);

        const guilds = await client.guilds.cache;
        guilds.each(async guild => {
            const guildData = this.getGuildData(guild.id);
            if(guildData.enableVerification)
                await this.applyVerificationSingle(userData, guild);
        });
    }

    async refreshGuild(guild) {
        const guildData = this.getGuildData(guild.id);
        if(!guildData.enableVerification)
            return;

        const members = await guild.members.fetch();

        members.each(async member => {
            const userData = WarframeProfileManager.instance.getUserData(member.user.id);
            await this.applyVerificationSingle(userData, guild);
        });
    }

    async initGuilds(guilds) {
        await guilds.each(guild => {
            this.initializeGuildData(guild);
        });
    }
}

module.exports = { WarframeGuildManager };