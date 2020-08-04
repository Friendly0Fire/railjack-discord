const Commando = require("discord.js-commando");
const { WarframeGuildManager } = require('../../modules/guild');

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
                    prompt: 'What is the new value?',
                    default: '*'
                }
            ]
        });
    }

    async run(msg, { setting, value }) {
        if(value == '*') {
            const guildData = WarframeGuildManager.instance.getGuildData(msg.guild.id);
            if(setting == '*') {
                let response = "The following settings are defined:\n";
                for(let [k, v] of Object.entries(guildData)) {
                    response += `"${k}": "${v}"\n`;
                }

                return msg.reply(response);
            }

            if(setting in guildData)
                return msg.reply(`Setting "${setting}" currently has value "${guildData[setting]}".`);

            return msg.reply(`Setting "${setting}" not found!`);
        }

        let data = {};
        data[setting] = value;

        WarframeGuildManager.instance.setGuildData(msg.guild.id, data);
        return msg.reply(`Success! Setting ${setting} has been set to ${value}.`);
    }
}