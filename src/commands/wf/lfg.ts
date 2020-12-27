import * as Commando from 'discord.js-commando';
import * as DiscordJS from 'discord.js';
import { WarframeLFGManager, ILFGEntry, ILFGArguments } from '../../modules/lfg';
import * as luxon from 'luxon';
import * as misc from '../../modules/misc';

export default class LFGCommand extends Commando.Command {
    constructor(client: Commando.CommandoClient) {
        super(client, {
            name: 'lfg',
            group: 'wf',
            memberName: 'lfg',
            description: 'Marks yourself as looking for group for a certain duration and specific nodes or modes.',
            examples: ['lfg 1h GP', 'lfg 2h30m Index RJ', 'lfg 30m *', 'lfg list', 'lfg stop'],
            guildOnly: true,
            argsType: 'multiple'
        });
    }

    private _replyEntries(msg: Commando.CommandoMessage, entries: Array<ILFGEntry>, prelude?: string) {
        let contents = prelude || "";
        const dateNow = luxon.DateTime.fromJSDate(new Date());
        contents += entries.map(e => {
            return "@" + e.member.nickname + " is available for " + e.nodes.join(", ") + " for the next " + misc.naturalDuration(dateNow.until(e.interval.end).toDuration()) + ".";
        }).join("\n");

        return msg.reply(contents, {
            allowedMentions: {
                users: [ msg.member.user.id ]
            }
        });
    }

    async run(msg: Commando.CommandoMessage, args: Array<string>): Promise<DiscordJS.Message | DiscordJS.Message[]> {

        if(args === undefined || args.length == 0) {
            return msg.reply('Invalid arguments. Provide a time and one or more nodes.');
        }

        if(args.length == 1) {
            switch(args[0]) {
                case 'list':
                    return this._replyEntries(msg, WarframeLFGManager.instance.getAllEntries());
                case 'stop':
                    const countRemoved = WarframeLFGManager.instance.removeEntries(msg.member);
                    return msg.reply('Removed ' + countRemoved + ' LFG entries. See you soon!');
                default:
                    return msg.reply('Invalid arguments. Provide a time and one or more nodes.');
            }
        }

        try {
            const entry = WarframeLFGManager.instance.parseArguments(msg.member, {
                timespan: args.shift() || "",
                nodes: args
            });

            WarframeLFGManager.instance.addEntry(entry);
            const matches = WarframeLFGManager.instance.getMatchingEntries(entry);
            if(matches.length > 0)
                return this._replyEntries(msg, matches, "Success! Here are existing LFG entries you might be interested in:\n");
            else
                return msg.reply("Success! You're listed as available and ready to go.");
        } catch(ex) {
            return msg.reply(`Error: ` + ex);
        }
    }
}