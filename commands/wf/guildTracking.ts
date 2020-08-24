import * as Commando from 'discord.js-commando';
import * as DiscordJS from 'discord.js';
import { WarframeTracker } from '../../modules/tracking';
import * as misc from '../../modules/misc';

export interface GuildTrackingData {
    platform: string;
    channel: DiscordJS.TextChannel;
    types: string;
}

export class GuildTrackingCommand extends Commando.Command {
    constructor(client: Commando.CommandoClient) {
        super(client, {
            name: 'track',
            group: 'wf',
            memberName: 'track',
            description: 'Allows administrators to set channels for event tracking per platform. The following types are currently supported: events, anomalies. Separate types with |, no spaces.',
            examples: ['track pc #events-pc events|anomalies'],
            guildOnly: true,
            userPermissions: ['ADMINISTRATOR'],
            args: [
                {
                    key: 'platform',
                    type: 'string',
                    prompt: 'What platform should this channel use?',
                    oneOf: ['pc', 'ps4', 'xb1', 'nsw']
                },
                {
                    key: 'channel',
                    type: 'text-channel',
                    prompt: 'What is the channel?'
                },
                {
                    key: 'types',
                    type: 'string',
                    prompt: 'What are the event types that should be tracked in this channel? Separate with |, no spaces.',
                    default: ''
                }
            ]
        });
    }

    async run(msg: Commando.CommandoMessage, data: GuildTrackingData): Promise<DiscordJS.Message | DiscordJS.Message[]> {
        await WarframeTracker.instance.setTrackingData(msg.guild, data);
        if(data.types == '')
            return msg.reply(`success! Channel #${data.channel.name} will no longer track anything for ${misc.PlatformsPretty[data.platform]}.`);
        else
            return msg.reply(`success! Channel #${data.channel.name} has been marked to track ${data.types} for ${misc.PlatformsPretty[data.platform]}.`);
    }
}