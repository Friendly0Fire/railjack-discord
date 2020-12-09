import * as DiscordJS from 'discord.js';

export const Platforms = {
    pc: "pc",
    ps: "ps",
    xb: "xb",
    nsw: "nsw"
};

export const PlatformsPretty = {
    pc: "PC",
    ps: "Playstation",
    xb: "Xbox",
    nsw: "Nintendo Switch"
};

export const PlatformsPrettyShort = {
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

export function filterSnowflakes(snowflakes: Array<DiscordJS.Snowflake | object>, coll: DiscordJS.Collection<string, any>): Array<DiscordJS.Snowflake | object> {
    if(coll == null || coll.size === undefined || coll.size == 0)
        return snowflakes.filter(s => s != null);

    const collectionValueType = Object.prototype.toString.call(coll.values().next().value);

    return snowflakes.filter(function(s) {
        if(s == null)
            return false;
        if(typeof(s) === 'string')
           return coll.has(s);
        if(typeof(s) === 'object') {
            if(Object.prototype.toString.call(s) == collectionValueType)
                return true;
        }

        return false;
    });
};