import { IWarframeProfile, WarframeProfileManager } from './profile';
import * as misc from './misc';
import * as bsqlite from 'better-sqlite3';
import * as DiscordJS from 'discord.js';
import * as luxon from 'luxon';

export interface ILFGArguments {
    timespan: string;
    nodes: Array<string>;
}

export interface LFGNode {
    name: string;
    id: number;
};

export interface ILFGEntry {
    id: number;
    member: DiscordJS.GuildMember;
    interval: luxon.Interval;
    nodes: Array<LFGNode>;
}

interface ILookupResult {
    id: number;
    name: string;
    aliasOf: number;
}

export class WarframeLFGManager {
    static instance: WarframeLFGManager;
    db: bsqlite.Database;
    lfg: Array<ILFGEntry>;
    gid: number;

    constructor(db: bsqlite.Database, client: DiscordJS.Client) {
        if(!!WarframeLFGManager.instance)
            throw "Instance already exists!";

        this.lfg = [];
        this.gid = 0;
        this.db = db;
        this.db.prepare(`CREATE TABLE IF NOT EXISTS lfgNode(
                            id INTEGER PRIMARY KEY,
                            name TEXT UNIQUE,
                            aliasOf INTEGER)`).run();

        WarframeLFGManager.instance = this;

        this._setupClient(client);
    }

    private _setupClient(client: DiscordJS.Client): void {
    }

    private _findNode(name: string): LFGNode {
        let result = this.db.prepare("SELECT * FROM lfgNode WHERE name = ?").get(name) as ILookupResult | undefined;
        if(result === undefined)
            throw "Invalid node name: " + name + ".";

        if(result.aliasOf != -1) {
            const result2 = this.db.prepare("SELECT * FROM lfgNode WHERE id = ?").get(result.aliasOf) as ILookupResult | undefined;
            if(result2 === undefined)
                throw "Invalid alias, please report to developer! Node name: " + result.name + "; alias ID: " + result.aliasOf + ".";
            result = result2;
        }

        return {
            name: result.name,
            id: result.id
        };
    }

    parseArguments(member: DiscordJS.GuildMember, args: ILFGArguments): ILFGEntry {
        const isoTimespan = 'PT' + args.timespan.toUpperCase();
        const interval = luxon.Interval.after(new Date(), luxon.Duration.fromISO(isoTimespan));
        let nodes: Array<LFGNode> = [];
        for(let r of args.nodes) {
            const n = this._findNode(r);
            nodes.push(n);
        }

        return {
            id: ++this.gid,
            member: member,
            interval: interval,
            nodes: nodes
        };
    }

    addEntry(entry: ILFGEntry): void {
        this.lfg.push(entry);
    }

    getMatchingEntries(entry: ILFGEntry): Array<ILFGEntry> {
        return this.lfg.filter((e) => {
            if(entry.id == e.id)
                return false;
            if(!entry.interval.overlaps(e.interval))
                return false;
            return entry.nodes.some(n => e.nodes.some(n2 => n.id == n2.id));
        });
    }
}