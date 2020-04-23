'use strict';

// Load libraries
const stripIndents = require('common-tags').stripIndents;
const axios = require('axios').default;
const { WarframeGuildManager } = require('./guild');
const misc = require('./misc');

class WarframeTracker {
    static instance = undefined;

    static TypeEvent = 1;
    static TypeAnomaly = 2;

    interval = null;
    cleared = false;
    trackingChannels = {};
    trackingMessages = {};
    eventHistory = {};
    previousAnomaly = {};

    constructor(db) {
        if(WarframeTracker.instance != undefined)
            throw "Instance already exists!";

        this.db = db;
        this.db.prepare(`CREATE TABLE IF NOT EXISTS tracking(
                            guildId TEXT,
                            channel TEXT,
                            mask INTEGER,
                            platform TEXT)`).run();

        misc.PlatformsList.forEach(platform => {
            this.trackingChannels[platform] = {};
            this.trackingMessages[platform] = {};
            this.eventHistory[platform] = {};
            this.previousAnomaly[platform] = { active: false };
        });

        WarframeTracker.instance = this;
    }

    setupClient(client) {
        this.interval = client.setInterval(() => this.tick(), 30000);
        this.client = client;

        client.on('ready', () => {
            this._initGuilds().then(() => {
                this.cleared = true;
                this.tick();
            });
        });

        client.on('guildCreate', async guild => {
            cleared = this.cleared;
            this.cleared = false;
            await this._initGuild(guild);
            if(cleared)
                this.cleared = true;
        });
    }

    _getMaskFromOrString(str) {
        let mask = 0;

        str.split("|").forEach(type => {
            switch(type.trim()) {
            case "events":
                mask += WarframeTracker.TypeEvent;
                break;
            case "anomalies":
                mask += WarframeTracker.TypeAnomaly;
                break;
            }
        });

        return mask;
    }

    setTrackingData(guild, data) {
        let entry = this.db.prepare("SELECT * FROM tracking WHERE guildId=? AND platform=?").get(guild.id, data.platform);
        if(entry != undefined) {
            this.db.prepare("UPDATE tracking SET channel=?, mask=? WHERE guildId=? AND platform=?").run(data.channel.id, this._getMaskFromOrString(data.types), guild.id, data.platform);
        } else {
            this.db.prepare("INSERT INTO tracking VALUES (?, ?, ?, ?)").run(guild.id, data.channel.id, this._getMaskFromOrString(data.types), data.platform);
        }

        this._initGuild(guild);
    }

    async _initGuilds() {
        await this.client.guilds.cache.each(async guild => await this._initGuild(guild));
    }

    async _initGuild(guild) {
        let trackingData = this.db.prepare("SELECT * FROM tracking WHERE guildId=?").all(guild.id);
        if(trackingData.length == 0)
            return;

        await trackingData.forEach(async trackingDatum => {
            let trackingChannel = await guild.channels.resolve(trackingDatum.channel);
            if(trackingChannel !== undefined) {
                this.trackingChannels[trackingDatum.platform][guild.id] = trackingChannel;
            }
        });
    }

    async _createTrackingMessage(guild, upd) {

        let trackingChannel = this.trackingChannels[upd.platform][guild.id];
        if(trackingChannel === undefined || trackingChannel == null)
            return;

        const msg = await trackingChannel.send(upd.content);

        let guildMessages = this.trackingMessages[upd.platform][guild.id] || {};
        guildMessages[upd.name] = msg;
        this.trackingMessages[upd.platform][guild.id] = guildMessages;
    }

    async _updateGuilds(upd) {
        await this.client.guilds.cache.each(async guild => {
            const trackingData = this.db.prepare("SELECT * FROM tracking WHERE guildId=? AND platform=?").all(guild.id, upd.platform);
            if(trackingData.length == 0)
                return;

            const trackingDatum = trackingData[0];

            if((trackingDatum.mask & upd.type) !== 0) {
                const trackingMessage = upd.postNew ? undefined : (this.trackingMessages[upd.platform][guild.id] || {})[upd.name];
                if(trackingMessage === undefined)
                    await this._createTrackingMessage(guild, upd);
                else
                    await trackingMessage.edit(upd.content);
            }
        });
    }

    async eventTick(platform) {
        const platformWFStats = platform == "nsw" ? "swi" : platform;
        const eventsResponse = await axios.get(`https://api.warframestat.us/${platformWFStats}/events`);
        if(eventsResponse.status !== 200)
            return;

        const events = eventsResponse.data;
        await events.forEach(async element => {
            const event = this.parseEvent(element, platform);
            await this._updateGuilds(event);
        });
    }

    async anomTick(platform) {
        const platformWFStats = platform == misc.Platforms.nsw ? "swi" : platform;
        const anomResponse = await axios.get(`https://api.warframestat.us/${platformWFStats}/sentientOutposts`);
        if(anomResponse.status !== 200)
            return;

        const anom = this.parseAnomaly(anomResponse.data, platform);
        await this._updateGuilds(anom);
    }

    tick() {
        if(!this.cleared)
            return;

        misc.PlatformsList.forEach(platform => {
            this.eventTick(platform);
            this.anomTick(platform);
        });
    }

    parseEvent(eventIn, platform) {
        let evt = {
            active: true,
            name: eventIn.description,
            ends: Date.parse(eventIn.expiry),
            currentStepStart: Date.parse(eventIn.altActivation),
            currentStepEnd: Date.parse(eventIn.altExpiry),
            nextStepStart: Date.parse(eventIn.nextAlt.activation),
            nextStepEnd: Date.parse(eventIn.nextAlt.expiry),
            type: WarframeTracker.TypeEvent,
            platform: platform
        };

        const prevEvt = this.eventHistory[platform][evt.name];
        this.eventHistory[platform][evt.name] = evt;

        if(prevEvt == undefined)
            evt.postNew = true;
        else {
            evt.postNew = prevEvt.ends != evt.ends;
            if((!isNaN(evt.currentStepStart) || !isNaN(prevEvt.currentStepStart)) && evt.currentStepStart != prevEvt.currentStepStart)
                evt.postNew = true;
            if((!isNaN(evt.currentStepEnd) || !isNaN(prevEvt.currentStepEnd)) && evt.currentStepEnd != prevEvt.currentStepEnd)
                evt.postNew = true;
            if((!isNaN(evt.nextStepStart) || !isNaN(prevEvt.nextStepStart)) && evt.nextStepStart != prevEvt.nextStepStart)
                evt.postNew = true;
            if((!isNaN(evt.nextStepEnd) || !isNaN(prevEvt.nextStepEnd)) && evt.nextStepEnd != prevEvt.nextStepEnd)
                evt.postNew = true;
        }

        const now = Date.now();

        evt.content = stripIndents`
                        **${evt.name}**
                        Time left: ${misc.timeDiff(now, evt.ends)}`;
        if(!isNaN(evt.currentStepEnd))
            evt.content += `\nCurrent phase ends in: ${misc.timeDiff(now, evt.currentStepEnd)}`;
        if(!isNaN(evt.nextStepStart))
            evt.content += `\nNext phase starts in: ${misc.timeDiff(now, evt.nextStepStart)}`;
        evt.content += `\nPlatform: ${misc.PlatformsPretty[platform]}`;

        return evt;
    }

    parseAnomaly(anomIn, platform) {
        let anom = {
            active: anomIn.active,
            location: (anomIn.mission || {}).node,
            ends: Date.parse(anomIn.previous.expiry),
            nextStart: Date.parse(anomIn.activation),
            type: WarframeTracker.TypeAnomaly,
            platform: platform
        }

        const prevAnom = this.previousAnomaly[platform];
        this.previousAnomaly[platform] = anom;

        anom.postNew = prevAnom == undefined || (anom.active && !prevAnom.active);

        const now = Date.now();

        anom.content = "**Sentient Anomaly**";
        if(!anom.active)
            anom.content += `\nNext appearance in: ${misc.timeDiff(now, anom.nextStart)}`;
        else
            anom.content += `\nLocation: ${anom.location}\nTime left: ${misc.timeDiff(now, anom.ends)}`;
        anom.content += `\nPlatform: ${misc.PlatformsPretty[platform]}`;

        return anom;
    }
}

module.exports = { WarframeTracker };