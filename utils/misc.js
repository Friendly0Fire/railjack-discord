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
    const msPerDay = msPerDay * 24;
    const diff = date2 - date1;
    const days = Math.floor(diff / msPerDay);
    const hours = Math.floor((diff - days * msPerDay) / msPerHour);
    const minutes = Math.floor((diff - days * msPerDay - hours * msPerHour) / msPerMinute);

    let diffText = "";
    if(days > 0)
        diffText += days + "d";
    if(hours > 0 || days > 0)
        diffText += hours + "h";
    if(minutes > 0 || hours > 0 || days > 0)
        diffText += minutes + "m";
    else
        diffText = "<1m";

    return diffText;
}