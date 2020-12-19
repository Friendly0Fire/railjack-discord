import * as uuid from 'uuid';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as misc from './misc';
import * as bsqlite from 'better-sqlite3';
import * as DiscordJS from 'discord.js';

export interface IWarframeProfile {
    userId: DiscordJS.Snowflake;
    platform: string;
    token: string;
    ign: string;
    verified: boolean;
};

export type ISetWarframeProfile = Partial<Omit<IWarframeProfile, "userId">>;

interface IWarframeWebsiteProfile {
    username: string;
    token: string;
    platform: string;
};

export class WarframeProfileManager {
    static instance: WarframeProfileManager;
    db: bsqlite.Database;

    constructor(db: bsqlite.Database, client: DiscordJS.Client) {
        if(!!WarframeProfileManager.instance)
            throw "Instance already exists!";

        this.db = db;
        this.db.prepare(`CREATE TABLE IF NOT EXISTS profiles(
                            userId TEXT PRIMARY KEY,
                            token TEXT, platform TEXT,
                            ign TEXT,
                            verified INTEGER)`).run();

        WarframeProfileManager.instance = this;
    }

    async _loadProfilePage(profileUrl: string): Promise<IWarframeWebsiteProfile> {
        let ret: IWarframeWebsiteProfile = {} as IWarframeWebsiteProfile;

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

    async verifyToken(user: DiscordJS.User, profileUrl: string): Promise<void> {
        const priorEntry: IWarframeProfile = this.db.prepare("SELECT token FROM profiles WHERE userId = ?").get(user.id);
        if(priorEntry == undefined)
            throw "No token found for user.";

        const pageResult = await this._loadProfilePage(this._stripUrl(profileUrl));

        if(pageResult.token.indexOf(priorEntry.token) == -1)
            throw "Token mismatch for user.";

        const platformForumMapping: misc.IPlatform = {
            "PC": misc.Platforms.pc,
            "XBOX": misc.Platforms.xb,
            "PSN": misc.Platforms.ps,
            "NSW": misc.Platforms.nsw
        };

        this.db.prepare("UPDATE profiles SET platform = ?, ign = ?, verified = 1 WHERE userId = ?").run(platformForumMapping[pageResult.platform], pageResult.username, user.id);
    }

    unverify(user: DiscordJS.User): void {
        const result = this.db.prepare("DELETE FROM profiles WHERE userId = ?").run(user.id);

        if(result.changes == 0)
            throw "No user verification was found!";
    }

    getUserData(user: DiscordJS.User): IWarframeProfile {
        const priorEntry: IWarframeProfile = this.db.prepare("SELECT * FROM profiles WHERE userId = ?").get(user.id);
        if(priorEntry == undefined) {
            const token = uuid.v4();
            this.db.prepare("INSERT INTO profiles VALUES (?, ?, '', '', 0)").run(user.id, token);

            return this.getUserData(user);
        }

        priorEntry.verified = !!priorEntry.verified;

        return priorEntry;
    }
}