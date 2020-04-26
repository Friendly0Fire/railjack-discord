const Commando = require("discord.js-commando");
const { WarframeGuildManager } = require('../../modules/guild');

module.exports = class GuildRefreshCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'refresh',
            group: 'wf',
            memberName: 'refresh',
            description: 'Allows administrators to refresh server after settings for the bot have been changed.',
            examples: ['settings verifiedRole Verified'],
            guildOnly: true,
            userPermissions: ['ADMINISTRATOR']
        });
    }

    async run(msg) {
        await WarframeGuildManager.instance.refreshGuild(msg.guild);
        return msg.reply(`Success! Refresh completed.`);
    }
}