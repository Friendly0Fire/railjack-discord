const Commando = require("discord.js-commando");
const Discord = require("discord.js");
const { MessageManager } = require('../../modules/message');

module.exports = class GuildMessageCreateCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'message-create',
            group: 'general',
            memberName: 'message-create',
            description: 'Allows administrators to create messages for the bot.',
            examples: ['messageCreate rules #rules 0 https://discordapp.com/channels/1234/1234/1234'],
            guildOnly: true,
            userPermissions: ['ADMINISTRATOR'],
            args: [
                {
                    key: 'nickname',
                    type: 'string',
                    prompt: 'What is the nickname of the message that you want to create?'
                },
                {
                    key: 'channel',
                    type: 'text-channel',
                    prompt: 'What is the channel you want the message to appear in?'
                },
                {
                    key: 'orderIndex',
                    type: 'integer',
                    prompt: 'What is the order index for this message (lower number = higher in the channel)?',
                    default: 0
                },
                {
                    key: 'content',
                    type: 'message',
                    prompt: 'What is the existing message URL to take the content from?',
                    default: '0'
                },
            ]
        });
    }

    async run(msg, { nickname, channel, orderIndex, content }) {
        let data = {
            orderIndex: orderIndex,
            channelId: channel.id
        };

        if(content instanceof Discord.Message)
            data[content] = content.content;

        MessageManager.instance.setMessage(msg.guild.id, nickname, data);
        return msg.reply(`success! Message has been created and is accessible using the nickname \`${nickname}\`.`);
    }
}