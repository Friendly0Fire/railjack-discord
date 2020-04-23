const Commando = require("discord.js-commando");
const { MessageManager } = require('../../modules/message');

module.exports = class GuildMessagePostCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'message-post',
            group: 'general',
            memberName: 'message-post',
            description: 'Allows administrators to post all messages for a given channel.',
            examples: ['messagesPost #rules'],
            guildOnly: true,
            userPermissions: ['ADMINISTRATOR'],
            args: [
                {
                    key: 'channel',
                    type: 'text-channel',
                    prompt: 'What is the channel you want to fill?'
                }
            ]
        });
    }

    async run(msg, { channel }) {
        const messages = MessageManager.instance.getMessagesIn(msg.guild.id, channel.id);

        const existingMessages = await channel.messages.fetch();

        await channel.bulkDelete(existingMessages);

        let postedCount = messages.length;

        await messages.forEach(async m => {
            if(m.content == undefined || m.content == null || m.content.trim().length == 0) {
                postedCount--;
                await msg.reply(`Message ${m.nickname} has no content and will not be posted.`);
            } else
                await channel.send(m.content);
        });

        return msg.reply(`${postedCount} message${postedCount != 1 ? "s have" : " has"} been posted.`);
    }
}