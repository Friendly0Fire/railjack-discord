const Commando = require("discord.js-commando");
const stripIndents = require('common-tags').stripIndents;
const { WarframeProfileManager } = require('../../modules/profile');
const { WarframeGuildManager } = require('../../modules/guild');

module.exports = class VerifyCommand extends Commando.Command {
    constructor(client) {
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

    async run(msg, { url }) {
        const token = WarframeProfileManager.instance.generateToken(msg.author.id);
        if(url == '') {
            return msg.direct(stripIndents`
                **Here is how to verify:**
                1. Navigate to the forums: <https://forums.warframe.com/>
                2. At the top right of the page, click on your profile picture.
                3. In the banner, click "Edit Profile".
                4. Paste the following text inside the text box: \`${token}\`.
                5. Click "Save".
                6. Copy the URL from your browser and paste it as an answer, it should look something like:
                \`https://forums.warframe.com/profile/<something>/\`
            `);
        } else {
            try {
                await WarframeProfileManager.instance.verifyToken(msg.author.id, url);
                await WarframeGuildManager.instance.applyVerification(msg.author.id, this.client);
                return msg.direct("Congratulations, you have been verified! Your nickname has been set accordingly.");
            } catch(error) {
                return msg.direct("Unfortunately, an error has occurred: " + error);
            }
        }
    }
}