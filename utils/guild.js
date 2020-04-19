'use strict';

class WarframeGuildManager {
    static instance = undefined;
    defaultVerifiedRole = "verified";
    defaultPlatform = "PC";

    constructor(db) {
        if(WarframeGuildManager.instance != undefined)
            throw "Instance already exists!";

        this.db = db;
        this.db.prepare('CREATE TABLE IF NOT EXISTS guilds(guildId TEXT PRIMARY KEY, verifiedRole TEXT DEFAULT ?, defaultPlatform TEXT DEFAULT ?, pcRole TEXT DEFAULT "pc", ps4Role TEXT DEFAULT "ps4", xb1Role TEXT DEFAULT "xb1", nswRole TEX DEFAULT "nsw")')
               .run(defaultVerifiedRole, defaultPlatform);

        WarframeGuildManager.instance = this;
    }

    setupClient(client) {
        client.on('guildCreate', this.initializeGuildData);
    }

    async initializeGuildData(guild) {
        this.db.prepare("INSERT INTO guilds VALUES (?)").run(guild.id);

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
}

module.exports = { WarframeGuildManager };