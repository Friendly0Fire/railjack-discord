const { Command } = require("discord.js-commando");

class VerifyCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'verify',
            group: 'wf',
            memberName: 'verify',
            description: 'Verifies Warframe username and platform given a profile URL.',
            throttling: {
                usages: 5,
                duration: 10
            }
        });
    }

    async run(msg) {

    }
}

module.exports = { VerifyCommand };