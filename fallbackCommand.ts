import * as Commando from 'discord.js-commando';
import * as DiscordJS from 'discord.js';
import { WarframeProfileManager } from './modules/profile';
import { WarframeGuildManager } from './modules/guild';

export class FallbackCommand extends Commando.Command {

    #profileUrl = /https:\/\/forums\.warframe\.com\/profile\/[0-9]+\-.+\//;

    constructor(client: Commando.CommandoClient) {
        super(client, {
            name: '',
            group: '',
            memberName: '',
            description: 'Aggregate fallback command.',
            guarded: true
        });
    }

    async run(msg: Commando.CommandoMessage): Promise<DiscordJS.Message | null> {
        if(msg.content.match(this.#profileUrl)) {
            try {
                await WarframeProfileManager.instance.verifyToken(msg.author.id, msg.content);
                await WarframeGuildManager.instance.applyVerification(msg.author.id, this.client);
                return <Promise<DiscordJS.Message>>msg.direct("Congratulations, you have been verified! Your nickname has been set accordingly.");
            } catch(error) {
                return <Promise<DiscordJS.Message>>msg.direct("Unfortunately, an error has occurred: " + error);
            }
        }
        return null;
    }
}