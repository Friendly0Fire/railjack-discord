'use strict';

// Load libraries
import { stripIndents } from 'common-tags';
import axios from 'axios';
import { WarframeGuildManager } from './guild';
import * as misc from './misc';
import * as bsqlite from 'better-sqlite3';
import * as DiscordJS from 'discord.js';

export interface WarframeTracking {
    guildId: string,
    channelId: string,
    mask: number,
    platform: string
};


interface TrackingChannels {
    [key: string]: {
        [key: string]: DiscordJS.TextChannel
    }
};


interface TrackingMessages {
    [key: string]: {
        [key: string]: {
            [key: string]: DiscordJS.Message
        }
    }
};

interface WarframeAnomalyEvent {
    active: boolean,
    location: string,
    ends: number,
    nextStart: number,
    type: number,
    platform: string,
    thumbnailUrl: string
    postNew: boolean
    content: string
};

interface WarframeEvent {
    active: boolean,
    name: string,
    location: string,
    ends: number,
    currentStepStart: number,
    currentStepEnd: number,
    nextStepStart: number,
    nextStepEnd: number,
    type: number,
    progress: number,
    platform: string,
    thumbnailUrl: string
    postNew: boolean
    content: string
};

export class WarframeTracker {
    static instance = undefined;

    static TypeEvent = 1;
    static TypeAnomaly = 2;

    interval = null;
    cleared = false;
    trackingChannels: TrackingChannels = {};
    trackingMessages: TrackingMessages = {};
    eventHistory: { [key: string]: { [key: string]: WarframeEvent } } = {};
    previousAnomaly: { [key: string]: WarframeAnomalyEvent } = {};

    thumbnailUrls: { [key: string]: string } = {};

    db: bsqlite.Database = null;
    client: DiscordJS.Client = null;

    constructor(db: bsqlite.Database) {
        if(WarframeTracker.instance != undefined)
            throw "Instance already exists!";

        this.db = db;
        this.db.prepare(`CREATE TABLE IF NOT EXISTS tracking(
                            guildId TEXT,
                            channelId TEXT,
                            mask INTEGER,
                            platform TEXT)`).run();

        misc.PlatformsList.forEach(platform => {
            this.trackingChannels[platform] = {};
            this.trackingMessages[platform] = {};
            this.eventHistory[platform] = {};
            this.previousAnomaly[platform] = { active: false } as WarframeAnomalyEvent;
        });

        WarframeTracker.instance = this;
    }

    setupClient(client: DiscordJS.Client) {
        this.interval = client.setInterval(() => this.tick(), 30000);
        this.client = client;

        client.on('ready', () => {
            this._initGuilds();
            this.cleared = true;
            this.tick();
        });

        client.on('guildCreate', guild => {
            let cleared = this.cleared;
            this.cleared = false;
            this._initGuild(guild);
            if(cleared)
                this.cleared = true;
        });
    }

    _getMaskFromOrString(str: string): number {
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

    async setTrackingData(guild: DiscordJS.Guild, data): Promise<void> {
        if(data.types == '') {
            this.db.prepare("DELETE FROM tracking WHERE guildId=? AND platform=? AND channelId=?").run(guild.id, data.platform, data.channel.id);
            delete this.trackingChannels[data.platform][guild.id];
            for(let [k,v] of Object.entries(this.trackingMessages[data.platform][guild.id])) {
                await v.delete();
                delete this.trackingMessages[data.platform][guild.id][k];
            }
            return;
        }

        let entry: WarframeTracking = this.db.prepare("SELECT * FROM tracking WHERE guildId=? AND platform=?").get(guild.id, data.platform);
        if(entry != undefined) {
            this.db.prepare("UPDATE tracking SET channelId=?, mask=? WHERE guildId=? AND platform=?").run(data.channel.id, this._getMaskFromOrString(data.types), guild.id, data.platform);
        } else {
            this.db.prepare("INSERT INTO tracking VALUES (?, ?, ?, ?)").run(guild.id, data.channel.id, this._getMaskFromOrString(data.types), data.platform);
        }

        this._initGuild(guild);
    }

    _initGuilds() {
        this.client.guilds.cache.each(guild => this._initGuild(guild));
    }

    _initGuild(guild: DiscordJS.Guild) {
        let trackingData: Array<WarframeTracking> = this.db.prepare("SELECT * FROM tracking WHERE guildId=?").all(guild.id);
        if(trackingData.length == 0)
            return;

        trackingData.forEach(trackingDatum => {
            let trackingChannel = <DiscordJS.TextChannel>guild.channels.resolve(trackingDatum.channelId);
            if(trackingChannel !== undefined) {
                this.trackingChannels[trackingDatum.platform][guild.id] = trackingChannel;
            }
        });
    }

    async _createTrackingMessage(guild: DiscordJS.Guild, upd) {
        let trackingChannel = this.trackingChannels[upd.platform][guild.id];
        if(trackingChannel === undefined || trackingChannel == null)
            return;

        const msg = await trackingChannel.send(upd.finalContent);

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

            const platformsInChannel = this.db.prepare("SELECT COUNT(channelId) FROM tracking WHERE guildId=? AND channelId=?").get(guild.id, trackingDatum.channelId)["COUNT(channelId)"];

            if((trackingDatum.mask & upd.type) !== 0) {
                if(platformsInChannel > 1)
                    upd.finalContent = upd.content + `\nPlatform: ${misc.PlatformsPretty[upd.platform]}`;
                else
                    upd.finalContent = upd.content;

                const trackingMessage = upd.postNew ? undefined : (this.trackingMessages[upd.platform][guild.id] || {})[upd.name];
                if(trackingMessage === undefined)
                    await this._createTrackingMessage(guild, upd);
                else
                    await trackingMessage.edit(upd.finalContent);
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
            const event = await this.parseEvent(element, platform);
            await this._updateGuilds(event);
        });
    }

    async anomTick(platform) {
        const platformWFStats = platform == misc.Platforms.nsw ? "swi" : platform;
        const anomResponse = await axios.get(`https://api.warframestat.us/${platformWFStats}/sentientOutposts`);
        if(anomResponse.status !== 200)
            return;

        const anom = await this.parseAnomaly(anomResponse.data, platform);
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

    async getThumbnail(name: string) {
        if(this.thumbnailUrls[name] != undefined && this.thumbnailUrls[name] != null)
            return this.thumbnailUrls[name];

        if(this.thumbnailUrls[name] == undefined) {
            const url = "https://radiantlabs.ca/wf/thumbnails/" + name.replace(" ", "_") + ".png";
            const thumbnailResponse = await axios.get(url);
            if(thumbnailResponse.status != 200) {
                this.thumbnailUrls[name] = null;
                return null;
            } else {
                this.thumbnailUrls[name] = url;
                return url;
            }
        }
    }

    async parseEvent(eventIn: any, platform: string) {
        let evt: WarframeEvent = {
            active: true,
            name: eventIn.description,
            location: (eventIn.mission || {}).node,
            ends: Date.parse(eventIn.expiry),
            currentStepStart: Date.parse(eventIn.altActivation),
            currentStepEnd: Date.parse(eventIn.altExpiry),
            nextStepStart: Date.parse(eventIn.nextAlt.activation),
            nextStepEnd: Date.parse(eventIn.nextAlt.expiry),
            type: WarframeTracker.TypeEvent,
            progress: eventIn.health,
            platform: platform,

            thumbnailUrl: null,
            postNew: false,
            content: ""
        };

        evt.thumbnailUrl = await this.getThumbnail(evt.name);

        const prevEvt = this.eventHistory[platform][evt.name];
        this.eventHistory[platform][evt.name] = evt;

        const hasPhases = eventIn.metadata.duration != undefined;

        if(prevEvt == undefined)
            evt.postNew = true;
        else {
            evt.postNew = prevEvt.ends != evt.ends;
            if(hasPhases) {
                if((!isNaN(evt.currentStepStart) || !isNaN(prevEvt.currentStepStart)) && evt.currentStepStart != prevEvt.currentStepStart)
                    evt.postNew = true;
                if((!isNaN(evt.currentStepEnd) || !isNaN(prevEvt.currentStepEnd)) && evt.currentStepEnd != prevEvt.currentStepEnd)
                    evt.postNew = true;
                if((!isNaN(evt.nextStepStart) || !isNaN(prevEvt.nextStepStart)) && evt.nextStepStart != prevEvt.nextStepStart)
                    evt.postNew = true;
                if((!isNaN(evt.nextStepEnd) || !isNaN(prevEvt.nextStepEnd)) && evt.nextStepEnd != prevEvt.nextStepEnd)
                    evt.postNew = true;
            }
        }

        const now = Date.now();

        evt.content = stripIndents`
                        **${evt.name}**
                        Time left: ${misc.timeDiff(now, evt.ends)}`;
        if(evt.location != undefined)
            evt.content += `\nLocation: ${evt.location}`;
        if(hasPhases) {
            if(!isNaN(evt.currentStepEnd) && evt.currentStepEnd != evt.nextStepStart)
                evt.content += `\nCurrent phase ends in: ${misc.timeDiff(now, evt.currentStepEnd)}`;
            if(!isNaN(evt.nextStepStart))
                evt.content += `\nNext phase starts in: ${misc.timeDiff(now, evt.nextStepStart)}`;
        }
        if(evt.progress != undefined)
            evt.content += `\nProgress left: \`${evt.progress}%\``;

        return evt;
    }

    async parseAnomaly(anomIn: any, platform: string) {
        let anom: WarframeAnomalyEvent = {
            active: anomIn.active,
            location: (anomIn.mission || {}).node,
            ends: Date.parse(anomIn.previous.expiry),
            nextStart: Date.parse(anomIn.activation),
            type: WarframeTracker.TypeAnomaly,
            platform: platform,

            thumbnailUrl: null,
            postNew: false,
            content: ""
        }

        anom.thumbnailUrl = await this.getThumbnail("SentientAnomaly");

        const prevAnom = this.previousAnomaly[platform];
        this.previousAnomaly[platform] = anom;

        anom.postNew = prevAnom == undefined || (anom.active && !prevAnom.active);

        const now = Date.now();

        anom.content = "**Sentient Anomaly**";
        if(!anom.active)
            anom.content += `\nNext appearance in: ${misc.timeDiff(now, anom.nextStart)}`;
        else
            anom.content += `\nLocation: ${anom.location}\nTime left: ${misc.timeDiff(now, anom.ends)}`;

        return anom;
    }
}