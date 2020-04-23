const Commando = require("discord.js-commando");
const { WarframeTracker } = require('../../modules/tracking');
const misc = require('../../modules/misc');

module.exports = class GuildTrackingCommand extends Commando.Command {
    constructor(client) {
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
                    prompt: 'What are the event types that should be tracked in this channel? Separate with |, no spaces.'
                }
            ]
        });
    }

    async run(msg, data) {
        WarframeTracker.instance.setTrackingData(msg.guild, data);
        return msg.reply(`success! Channel #${data.channel.name} has been marked to track ${data.types} for ${misc.PlatformsPretty[data.platform]}.`);
    }
}