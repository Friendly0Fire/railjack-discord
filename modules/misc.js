'use strict';

module.exports = {
    Platforms: {
        pc: "pc",
        ps4: "ps4",
        xb1: "xb1",
        nsw: "nsw"
    },
    PlatformsPretty: {
        pc: "PC",
        ps4: "Playstation 4",
        xb1: "Xbox One",
        nsw: "Nintendo Switch"
    },
    PlatformsPrettyShort: {
        pc: "PC",
        ps4: "PS4",
        xb1: "XB1",
        nsw: "Switch"
    },
    PlatformsList: ["pc", "ps4", "xb1", "nsw"]
};

module.exports.timeDiff = (date1, date2) => {
    const msPerMinute = 1000 * 60;
    const msPerHour = msPerMinute * 60;
    const msPerDay = msPerHour * 24;
    const diff = date2 - date1;
    const days = Math.floor(diff / msPerDay);
    const hours = Math.floor((diff - days * msPerDay) / msPerHour);
    const minutes = Math.floor((diff - days * msPerDay - hours * msPerHour) / msPerMinute);

    let timeElements = [];
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

module.exports.filterSnowflakes = function(snowflakes, coll) {
    if(coll == null || coll.size === undefined || coll.size == 0)
        return snowflakes.filter(s => s != null);

    return snowflakes.filter(s => {
        if(s == null)
            return false;
        if(typeof(s) === 'string')
           return coll.has(s);
        if(typeof(s) === 'object') {
            if(Object.prototype.toString(s) == Object.prototype.toString(coll.values().next().value))
                return true;
        }

        return false;
    });
};