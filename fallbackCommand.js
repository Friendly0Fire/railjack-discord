const Commando = require("discord.js-commando");
const { WarframeProfileManager } = require('./modules/profile');
const { WarframeGuildManager } = require('./modules/guild');

module.exports = class FallbackCommand extends Commando.Command {

    #profileUrl = /https:\/\/forums\.warframe\.com\/profile\/[0-9]+\-.+\//;

    constructor(client) {
        super(client, {
            name: '',
            group: '',
            memberName: '',
            description: 'Aggregate fallback command.',
            guarded: true
        });
    }

    async run(msg) {
        if(msg.content.match(this.#profileUrl)) {
            try {
                await WarframeProfileManager.instance.verifyToken(msg.author.id, msg.content);
                await WarframeGuildManager.instance.applyVerification(msg.author.id, this.client);
                return msg.direct("Congratulations, you have been verified! Your nickname has been set accordingly.");
            } catch(error) {
                return msg.direct("Unfortunately, an error has occurred: " + error);
            }
        }
    }
}