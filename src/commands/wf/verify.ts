import * as Commando from 'discord.js-commando';
import * as DiscordJS from 'discord.js';
import { stripIndents } from 'common-tags';
import { WarframeProfileManager } from '../../modules/profile';
import { WarframeGuildManager } from '../../modules/guild';

export default class VerifyCommand extends Commando.Command {
    constructor(client: Commando.CommandoClient) {
        super(client, {
            name: 'verify',
            group: 'wf',
            memberName: 'verify',
            description: 'Verifies Warframe username and platform given a profile URL.',
            examples: ['verify', 'verify https://forums.warframe.com/profile/123456-abcdef/'],
            guildOnly: false,
            args: [
                {
                    key: 'url',
                    type: 'string',
                    prompt: 'What is your Warframe profile URL?',
                    default: ''
                }
            ]
        });
    }

    async run(msg: Commando.CommandoMessage, { url }: { url: string }): Promise<DiscordJS.Message | DiscordJS.Message[]> {
        const userData = WarframeProfileManager.instance.getUserData(msg.author);
        if(url == '') {
            const baseMessage = stripIndents`
            **Here is how to verify:**
            1. Navigate to the forums: <https://forums.warframe.com/>
            2. At the top right of the page, click on your profile picture.
            3. In the banner, click "Edit Profile".
            4. Paste the following text inside the text box: \`${userData.token}\`.
            5. Click "Save".
            6. Copy the URL from your browser and`;

            return msg.direct(baseMessage + ` paste it as an answer to this DM, it should look something like:
                \`https://forums.warframe.com/profile/<something>/\`
            `).catch(() => msg.reply(baseMessage + ` re-run this command with the URL appended, it should look something like:
            \`${msg.guild != undefined ? msg.guild.commandPrefix : ""}verify https://forums.warframe.com/profile/<something>/\`
        `));
        } else {
            try {
                await WarframeProfileManager.instance.verifyToken(msg.author, url);
                await WarframeGuildManager.instance.applyVerification(msg.author, this.client);
                const baseMessage = "Congratulations, you have been verified! Your nickname has been set accordingly. *You can now remove the code from your profile.*";
                return msg.direct(baseMessage).catch(() => msg.reply(baseMessage));
            } catch(error) {
                const baseMessage = "Unfortunately, an error has occurred: " + error;
                return msg.direct(baseMessage).catch(() => msg.reply(baseMessage));
            }
        }
    }
}