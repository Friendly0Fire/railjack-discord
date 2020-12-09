import * as uuid from 'uuid';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as misc from './misc';
import * as bsqlite from 'better-sqlite3';
import * as DiscordJS from 'discord.js';

export interface WarframeProfile {
    userId: string,
    token: string,
    ign: string,
    verified: boolean
};

export class WarframeProfileManager {
    static instance: WarframeProfileManager = undefined;
    db: bsqlite.Database = null;

    constructor(db) {
        if(WarframeProfileManager.instance != undefined)
            throw "Instance already exists!";

        this.db = db;
        this.db.prepare(`CREATE TABLE IF NOT EXISTS profiles(
                            userId TEXT PRIMARY KEY,
                            token TEXT, platform TEXT,
                            ign TEXT,
                            verified INTEGER)`).run();

        WarframeProfileManager.instance = this;
    }

    generateToken(userId: string): string {
        const priorEntry: WarframeProfile = this.db.prepare("SELECT token FROM profiles WHERE userId = ?").get(userId);
        if(priorEntry != undefined)
            return priorEntry.token;

        const token = uuid.v4();
        this.db.prepare("INSERT INTO profiles VALUES (?, ?, '', '', 0)").run(userId, token);

        return token;
    }

    setupClient(client: DiscordJS.Client) { }

    async _loadProfilePage(profileUrl: string) {
        let ret = {
            username: null,
            token: null,
            platform: null
        };

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
            const platformEnd = ret.username.indexOf(")");
            ret.platform = ret.username.slice(1, platformEnd);
            ret.username = ret.username.slice(platformEnd + 1);
        } else
            ret.platform = "PC";

        return ret;
    }

    _stripUrl(profileUrl: string): string {
        const profileIndex = profileUrl.indexOf("profile/");
        if(profileIndex != -1)
            profileUrl = profileUrl.slice(profileIndex + 8);

        return profileUrl.replace("/", "");
    }

    async verifyToken(userId: string, profileUrl: string) {
        const priorEntry: WarframeProfile = this.db.prepare("SELECT token FROM profiles WHERE userId = ?").get(userId);
        if(priorEntry == undefined)
            throw "No token found for user.";

        const pageResult = await this._loadProfilePage(this._stripUrl(profileUrl));

        if(pageResult.token.indexOf(priorEntry.token) == -1)
            throw "Token mismatch for user.";

        const platformForumMapping = {
            "PC": misc.Platforms.pc,
            "XBOX": misc.Platforms.xb,
            "PSN": misc.Platforms.ps,
            "NSW": misc.Platforms.nsw
        };

        this.db.prepare("UPDATE profiles SET platform = ?, ign = ?, verified = 1 WHERE userId = ?").run(platformForumMapping[pageResult.platform], pageResult.username, userId);
    }

    getUserData(userId: string): WarframeProfile {
        const priorEntry: WarframeProfile = this.db.prepare("SELECT * FROM profiles WHERE userId = ?").get(userId);
        if(priorEntry == undefined)
            return {
                userId: userId,
                verified: false,
                token: null,
                ign: null
            };

        priorEntry.verified = !!priorEntry.verified;

        return priorEntry;
    }
}