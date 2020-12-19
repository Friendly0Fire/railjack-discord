import * as Commando from 'discord.js-commando';
import * as DiscordJS from 'discord.js';
import { WarframeProfileManager } from '../../modules/profile';
import { WarframeGuildManager } from '../../modules/guild';

export default class UnverifyCommand extends Commando.Command {
    constructor(client: Commando.CommandoClient) {
        super(client, {
            name: 'unverify',
            group: 'wf',
            memberName: 'unverify',
            description: 'Forcibly clears verification status for a user.',
            examples: ['unverify UserABC'],
            guildOnly: false,
            args: [
                {
                    key: 'user',
                    type: 'user',
                    prompt: 'Which user should be cleared?',
                    default: ''
                }
            ]
        });
    }

    async run(msg: Commando.CommandoMessage, { user }: { user: DiscordJS.User }): Promise<DiscordJS.Message | DiscordJS.Message[]> {
        try {
            await WarframeProfileManager.instance.unverify(user);
            await WarframeGuildManager.instance.applyVerification(user, this.client);

            const baseMessage = "User " + user.username + " has been unverified.";
            return msg.reply(baseMessage);
        } catch(error) {
            const baseMessage = "Unfortunately, an error has occurred: " + error;
            return msg.reply(baseMessage);
        }
    }
}