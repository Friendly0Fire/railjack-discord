import * as Commando from 'discord.js-commando';
import * as DiscordJS from 'discord.js';
import { WarframeGuildManager } from '../../modules/guild';

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

    async run(msg: Commando.CommandoMessage): Promise<DiscordJS.Message | DiscordJS.Message[]> {
        await WarframeGuildManager.instance.refreshGuild(msg.guild);
        return msg.reply(`Success! Refresh completed.`);
    }
}