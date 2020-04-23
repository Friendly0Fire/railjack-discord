const Commando = require("discord.js-commando");
const { MessageManager } = require('../../modules/message');
const stripIndents = require('common-tags').stripIndents;

module.exports = class GuildMessageGetCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'message-get',
            group: 'general',
            memberName: 'message-get',
            description: 'Allows administrators to view existing messages.',
            examples: ['messageGet rules'],
            guildOnly: true,
            userPermissions: ['ADMINISTRATOR'],
            args: [
                {
                    key: 'nickname',
                    type: 'string',
                    prompt: 'What is the nickname of the message that you want to view?',
                    default: ''
                }
            ]
        });
    }

    async run(msg, { nickname }) {
        if(nickname == '') {
            const messagesData = MessageManager.instance.getMessages(msg.guild.id);

            let response = "**the following messages are set for this server (use their nickname for more details):**\n";
            let channelId = '';
            messagesData.forEach(m => {
                if(channelId != m.channelId) {
                    response += `- <#${m.channelId}> \n`;
                    channelId = m.channelId;
                }
                response += `    \`(${m.orderIndex}) ${m.nickname}\`\n`;
            });

            return msg.reply(response);
        } else {
            const msgData = MessageManager.instance.getMessage(msg.guild.id, nickname);

            const channel = msg.guild.channels.cache.get(msgData.channelId);
            const message = channel ? channel.messages.fetch(msgData.messageId) : undefined;

            return msg.reply(stripIndents`
                                Nickname: ${msgData.nickname}
                                Channel: ${channel ? channel.name : "not set"}
                                Message: ${message ? message.url : "not set"}
                                Ordering index: ${msgData.orderIndex}
                                Content:` + "\n\n" + (msgData.content || "<none>"));
        }
    }
}