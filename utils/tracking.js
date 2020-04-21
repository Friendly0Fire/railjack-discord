'use strict';

// Load libraries
const stripIndents = require('common-tags').stripIndents;
const axios = require('axios').default;
const { WarframeGuildManager } = require('guilds');
const misc = require('misc');

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
        this.interval = client.setInterval(this.tick, 30000);
        this.client = client;

        this._initGuilds().then(() => this.cleared = true);

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
                mask += this.TypeEvent;
                break;
            case "anomalies":
                mask += this.TypeAnomaly;
                break;
            }
        });

        return mask;
    }

    setTrackingData(guild, data) {
        let entry = this.db.prepare("SELECT * FROM tracking WHERE guildId=? AND platform=?").get(guild.id, data.platform);
        if(entry != undefined) {
            this.db.prepare("UPDATE tracking SET channel=?, mask=? WHERE guildId=? AND platform=?").run(data.channel.name, this._getMaskFromOrString(data.types), guild.id, data.platform);
        } else {
            this.db.prepare("INSERT INTO tracking(?, ?, ?, ?").run(guild.id, data.channel.name, this._getMaskFromOrString(data.types), data.platform);
        }
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
        if(trackingChannel === undefined)
            return;

        const msg = await trackingChannel.send(upd.content);

        let guildMessages = this.trackingMessages[upd.platform][guild.id] || {};
        guildMessages[upd.name] = msg;
        this.trackingMessages[upd.platform][guild.id] = guildMessages;
    }

    async _updateGuilds(upd) {
        await this.client.guilds.cache.each(async guild => {
            let trackingDatum = this.db.prepare("SELECT * FROM tracking WHERE guildId=? AND platform=?").all(guild.id, upd.platform);
            if(trackingDatum.length == 0)
                return;

            if((trackingDatum.mask & upd.type) !== 0) {
                const trackingMessage = upd.postNew ? undefined : this.trackingMessages[upd.platform][guild.id][upd.name];
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

        const events = JSON.parse(eventsResponse.data);
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

        const anom = this.parseAnomaly(JSON.parse(anomResponse.data), platform);
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
            name: eventIn.description,
            ends: Date.parse(eventIn.expiry),
            currentStepStart: Date.parse(eventIn.altActivation),
            currentStepEnd: Date.parse(eventIn.altExpiry),
            nextStepStart: Date.parse(eventIn.nextAlt.activation),
            nextStepEnd: Date.parse(eventIn.nextAlt.expiry),
            type: this.TypeEvent,
            platform: platform
        };

        const prevEvt = eventHistory[platform][evt.name];
        eventHistory[platform][evt.name] = evt;

        evt.postNew = prevEvt.ends != evt.ends;
        if((!isNaN(evt.currentStepStart) || !isNaN(prevEvt.currentStepStart)) && evt.currentStepStart != prevEvt.currentStepStart)
            evt.postNew = true;
        if((!isNaN(evt.currentStepEnd) || !isNaN(prevEvt.currentStepEnd)) && evt.currentStepEnd != prevEvt.currentStepEnd)
            evt.postNew = true;
        if((!isNaN(evt.nextStepStart) || !isNaN(prevEvt.nextStepStart)) && evt.nextStepStart != prevEvt.nextStepStart)
            evt.postNew = true;
        if((!isNaN(evt.nextStepEnd) || !isNaN(prevEvt.nextStepEnd)) && evt.nextStepEnd != prevEvt.nextStepEnd)
            evt.postNew = true;

        const now = Date.now();

        evt.content = stripIndents`
                        **${evt.name}**
                        Time left: ${misc.timeDiff(now, evt.ends)}`;
        if(!isNaN(evt.currentStepEnd))
            evt.content += `\nCurrent phase time left: ${misc.timeDiff(now, evt.currentStepEnd)}`;
        if(!isNaN(evt.nextStepStart))
            evt.content += `\nNext phase time to start: ${misc.timeDiff(now, evt.nextStepStart)}`;
        evt.content += `\nPlatform: ${platform}`;

        return evt;
    }

    parseAnomaly(anomIn, platform) {
        if(!anomIn.active) {
            this.previousAnomaly[platform] = { active: false };
            return this.previousAnomaly[platform];
        }

        let anom = {
            location: anomIn.mission.node,
            ends: Date.parse(anomIn.expiry),
            platform: platform
        }

        const prevAnom = this.previousAnomaly[platform];
        this.previousAnomaly[platform] = anom;

        anom.postNew = !prevAnom.active || prevAnom.ends != anom.ends;

        const now = Date.now();

        anom.content = stripIndents`
                        **Sentient Anomaly sighted**
                        Location: ${anom.location}
                        Time left: ${misc.timeDiff(now, anom.ends)}
                        Platform: ${platform}`;

        return anom;
    }
}

module.exports = { WarframeTracker };