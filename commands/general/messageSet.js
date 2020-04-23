const Commando = require("discord.js-commando");
const { MessageManager } = require('../../modules/message');

module.exports = class GuildMessageSetCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'message-set',
            group: 'general',
            memberName: 'message-set',
            description: 'Allows administrators to change message settings for the bot.',
            examples: ['messageSet rules channel #rules'],
            guildOnly: true,
            userPermissions: ['ADMINISTRATOR'],
            args: [
                {
                    key: 'nickname',
                    type: 'string',
                    prompt: 'What is the nickname of the message that you want to change?'
                },
                {
                    key: 'setting',
                    type: 'string',
                    prompt: 'What setting do you want to change?'
                },
                {
                    key: 'value',
                    type: 'string',
                    prompt: 'What is the new value?'
                }
            ]
        });
    }

    async run(msg, { nickname, setting, value }) {

        if(setting == "content") {
            const linkRegex = /^https:\/\/discordapp.com\/channels\/([0-9]+)\/([0-9]+)\/([0-9]+)/;
            const linkResults = value.match(linkRegex);
            if(linkResults != null) {
                try {
                    const refGuild = await msg.client.guilds.resolve(linkResults[1]);
                    const refChannel = await refGuild.channels.resolve(linkResults[2]);
                    const refMessage = await refChannel.messages.fetch(linkResults[3]);
                    if(refMessage)
                        value = refMessage.content;
                    else
                        throw "Message not found!";
                } catch(e) {
                    return msg.reply("The provided message link was invalid or could not be fetched by this bot.");
                }
            }
        }

        let data = {};
        data[setting] = value;

        MessageManager.instance.setMessage(msg.guild.id, nickname, data);
        return msg.reply(`success! Setting ${setting} has been set for message ${nickname} to:\n` + value);
    }
}