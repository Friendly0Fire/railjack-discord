import * as Commando from 'discord.js-commando';
import * as DiscordJS from 'discord.js';

export default class StopCommand extends Commando.Command {
    constructor(client: Commando.CommandoClient) {
        super(client, {
            name: 'stop',
            group: 'general',
            memberName: 'stop',
            description: 'Stops the bot.',
            examples: ['stop'],
            guildOnly: false,
            ownerOnly: true
        });
    }

    async run(msg: Commando.CommandoMessage): Promise<DiscordJS.Message[]> {
        await msg.reply("Stopping bot now...");
        msg.client.destroy();
        return [];
    }
}