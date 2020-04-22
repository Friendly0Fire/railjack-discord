const Commando = require("discord.js-commando");
const { WarframeGuildManager } = require('../../utils/guild');

module.exports = class GuildSettingsCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'settings',
            group: 'wf',
            memberName: 'settings',
            description: 'Allows administrators to change server settings for the bot.',
            examples: ['settings verifiedRole Verified'],
            guildOnly: true,
            userPermissions: ['ADMINISTRATOR'],
            args: [
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

    async run(msg, { setting, value }) {
        let data = {};
        data[setting] = value;

        WarframeGuildManager.instance.setGuildData(msg.guild.id, data);
        return msg.reply(`Success! Setting ${setting} has been set to ${value}.`);
    }
}