const Commando = require("discord.js-commando");
const { WarframeIntrinsicsManager } = require('../../modules/intrinsics');
const misc = require('../../modules/misc');

module.exports = class IntrinsicsMenuCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'intrinsics',
            group: 'wf',
            memberName: 'intrinsics',
            description: 'Deploys a multi-message Intrinsics menu with reactions for automatic role assignment.',
            examples: ['intrinsics'],
            guildOnly: true,
            userPermissions: ['ADMINISTRATOR']
        });
    }

    async run(msg, data) {
        await WarframeIntrinsicsManager.instance.createIntrinsicsMessages(msg.guild, msg.channel);
    }
}