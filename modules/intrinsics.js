'use strict';

const misc = require('./misc');
const discord = require('discord.js');
const chroma = require('chroma-js');

class WarframeIntrinsicsManager {
    static instance = undefined;

    static reactions = [
        "1️⃣",
        "2️⃣",
        "3️⃣",
        "4️⃣",
        "5️⃣",
        "6️⃣",
        "7️⃣",
        "8️⃣",
        "9️⃣",
        "🔟"
    ];

    static isValidReaction(reactionName) {
        return WarframeIntrinsicsManager.reactions.includes(reactionName);
    }

    static reactionNameToNumber(reactionName) {
        return WarframeIntrinsicsManager.reactions.indexOf(reactionName) + 1;
    }

    static intrinsicsColors = {
        tactical: '#AC92EB',
        piloting: '#4FC1E8',
        gunnery: '#A0D568',
        engineering: '#FFCE54',
        command: '#ED5564'
    };

    guildMessages = {
        tactical: {},
        piloting: {},
        gunnery: {},
        engineering: {}
    };

    constructor(db) {
        if(WarframeIntrinsicsManager.instance != undefined)
            throw "Instance already exists!";

        this.db = db;
        this.db.prepare(`CREATE TABLE IF NOT EXISTS intrinsics(
                            guildId TEXT PRIMARY KEY,
                            channel TEXT,
                            tactical TEXT,
                            piloting TEXT,
                            gunnery TEXT,
                            engineering TEXT)`).run();

        WarframeIntrinsicsManager.instance = this;
    }

    setupClient(client) {
        client.on('ready', async () => {
            await this.initGuilds(client.guilds.cache);
        });
    }

    setGuildData(guild, channel, messages) {
        const orderedMessages = [ messages.tactical.id, messages.piloting.id, messages.gunnery.id, messages.engineering.id ];

        const guildData = this.db.prepare("SELECT * FROM intrinsics WHERE guildId = ?").get(guild.id);

        if(guildData == undefined)
            this.db.prepare("INSERT INTO intrinsics VALUES (?, ?, ?, ?, ?, ?)").run(guild.id, channel.id, ...orderedMessages);
        else
            this.db.prepare(`UPDATE intrinsics SET  channel=?,
                                                    tactical=?,
                                                    piloting=?,
                                                    gunnery=?,
                                                    engineering=?
                                               WHERE guildId=?`).run(channel.id, ...orderedMessages, guild.id);
        this.refreshGuild(guild);
    }

    getGuildData(guild) {
        const guildData = this.db.prepare("SELECT * FROM intrinsics WHERE guildId = ?").get(guild.id);

        return guildData;
    }

    async refreshGuild(guild) {
        const data = this.getGuildData(guild);
        if(data == undefined)
            return;

        const channel = await guild.channels.resolve(data.channel);

        for(let k of Object.keys(this.guildMessages)) {
            let msg = await channel.messages.fetch(data[k]);

            let collector = msg.createReactionCollector((reaction, user) => {
                return WarframeIntrinsicsManager.isValidReaction(reaction.emoji.name);
            });
            collector.on('collect', async (reaction, user) => {
                await this.react(k, true, reaction, user, guild);
            });
            collector.on('dispose', async (reaction, user) => {
                await this.react(k, false, reaction, user, guild);
            });

            this.guildMessages[k][guild.id] = collector;
        }
    }

    async react(type, added, reaction, user, guild) {
        if(user.id == user.client.user.id)
            return;

        const member = await guild.members.resolve(user);
        const level = WarframeIntrinsicsManager.reactionNameToNumber(reaction.emoji.name);

        await this.setRole(type, added, level, member, guild);
        if(added)
            await this.clearOtherReactions(reaction.message, type, level, user, member, guild);
    }

    async setRole(type, added, level, member, guild) {
        const roleName = `${type}-${level}`;
        let role = guild.roles.cache.find(x => x.name == roleName);
        if(role == undefined) {
            let roles = await guild.roles.fetch();
            role = roles.cache.find(x => x.name == `${type}-${level}`);
        }

        if(role && member.manageable) {
            if(added)
                await member.roles.add(role);
            else
                await member.roles.remove(role);
        }
    }

    async clearOtherReactions(message, type, level, user, member, guild) {
        const relevantReactions = message.reactions.cache.filter(x => WarframeIntrinsicsManager.isValidReaction(x.emoji.name) && WarframeIntrinsicsManager.reactionNameToNumber(x.emoji.name) != level);
        await relevantReactions.each(async r => {
            const allUsers = await r.users.fetch();
            if(allUsers.get(user.id)) {
                r.users.remove(user.id);
                this.setRole(type, false, WarframeIntrinsicsManager.reactionNameToNumber(r.emoji.name), member, guild);
            }
        });
    }

    async initGuilds(guilds) {
        await guilds.each(guild => {
            this.refreshGuild(guild);
        });
    }

    async createIntrinsicsMessage(channel, type) {
        const titles = {
            tactical: "Tactical Intrinsic",
            piloting: "Piloting Intrinsic",
            gunnery: "Gunnery Intrinsic",
            engineering: "Engineering Intrinsic"
        };
        const urls = {
            tactical: "https://radiantlabs.ca/railjack/TacticalIntrinsic.png",
            piloting: "https://radiantlabs.ca/railjack/PilotingIntrinsic.png",
            gunnery: "https://radiantlabs.ca/railjack/GunneryIntrinsic.png",
            engineering: "https://radiantlabs.ca/railjack/EngineeringIntrinsic.png"
        };

        const embed = new discord.MessageEmbed()
                        .setTitle(titles[type])
                        .setColor(WarframeIntrinsicsManager.intrinsicsColors[type])
                        .setThumbnail(urls[type])
                        .setDescription(`Please select your current ${titles[type]} level from the list below.`);

        const msg = await channel.send(embed);

        await WarframeIntrinsicsManager.reactions.forEach(async emoji => await msg.react(emoji));

        return msg;
    }

    async createIntrinsicsMessages(guild, channel) {
        const priorData = this.getGuildData(guild);
        const priorChannel = priorData != undefined ? guild.channels.resolve(priorData.channel) : undefined;

        const messages = {
            tactical: {},
            piloting: {},
            gunnery: {},
            engineering: {}
        };
        for(let k of Object.keys(messages)) {

            if(priorChannel != undefined && priorData != undefined && k in priorData)
                priorChannel.messages.delete(priorData[k]);

            messages[k] = await this.createIntrinsicsMessage(channel, k);
        }

        this.setGuildData(guild, channel, messages);

        for(let level = 10; level >= 1; level--) {
            for(let type of Object.keys(messages)) {
                const roleName = `${type}-${level}`;
                let role = guild.roles.cache.find(x => x.name == roleName);

                if(role == undefined) {
                    const rcolor = chroma(WarframeIntrinsicsManager.intrinsicsColors[type]).set('hsl.l', (level * 5 + 20) / 100.).hex('rgb');
                    role = await guild.roles.create({
                        data: {
                            name: roleName,
                            color: rcolor,
                            mentionable: false
                        }
                    });
                }
            }
        }
    }
}

module.exports = { WarframeIntrinsicsManager };