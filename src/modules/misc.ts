import * as DiscordJS from 'discord.js';
import * as luxon from 'luxon';

export interface IPlatform {
    [platform: string]: string;
}

export const Platforms: IPlatform = {
    pc: "pc",
    ps: "ps",
    xb: "xb",
    nsw: "nsw"
};

export const PlatformsPretty: IPlatform = {
    pc: "PC",
    ps: "Playstation",
    xb: "Xbox",
    nsw: "Nintendo Switch"
};

export const PlatformsPrettyShort: IPlatform = {
    pc: "PC",
    ps: "PS",
    xb: "XB",
    nsw: "Switch"
};

export const PlatformsList = ["pc", "ps", "xb", "nsw"];

export function timeDiff(date1: number | Date, date2: number | Date): string {
    date1 = typeof date1 == "number" ? date1 : date1.getTime();
    date2 = typeof date2 == "number" ? date1 : date2.getTime();
    const msPerMinute = 1000 * 60;
    const msPerHour = msPerMinute * 60;
    const msPerDay = msPerHour * 24;
    const diff = date2 - date1;
    const days = Math.floor(diff / msPerDay);
    const hours = Math.floor((diff - days * msPerDay) / msPerHour);
    const minutes = Math.floor((diff - days * msPerDay - hours * msPerHour) / msPerMinute);

    let timeElements: Array<string> = [];
    if(days > 0)
        timeElements.push(days.toString().padStart(2, '0') + " days");
    if(hours > 0 || days > 0)
        timeElements.push(hours.toString().padStart(2, '0') + " hours");
    if(minutes > 0 || hours > 0 || days > 0)
        timeElements.push(minutes.toString().padStart(2, '0') + " minutes");
    else
        return "`<1 minute`";

    return "`" + timeElements.join(", ") + "`";
}

export function validURL(str: string): boolean {
    var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
        '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
    return !!pattern.test(str);
}

export function naturalDuration(d: luxon.Duration): string {
    let s = "";
    if(d.hours > 0)
        s += d.hours + " hours";
    if(d.minutes > 0)
        s += (d.hours > 0 ? " and " : "") + d.minutes + " minutes";

    return s;
}

declare global {
    interface Object {
        modify(f: (o: Object) => Object): Object;
    }
}

Object.prototype.modify = function(f: (o: Object) => Object) {
    f(this);
    return this;
}