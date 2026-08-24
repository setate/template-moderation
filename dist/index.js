"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const config_1 = require("./config");
const commands_1 = require("./commands");
const deploy_commands_1 = require("./deploy-commands");
const scheduler_1 = require("./scheduler");
const messageCreate_1 = require("./events/messageCreate");
const guildMemberAdd_1 = require("./events/guildMemberAdd");
const guildMemberRemove_1 = require("./events/guildMemberRemove");
const messageReactionAdd_1 = require("./events/messageReactionAdd");
const messageReactionRemove_1 = require("./events/messageReactionRemove");
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.DirectMessages,
        discord_js_1.GatewayIntentBits.GuildMembers,
        discord_js_1.GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [discord_js_1.Partials.Message, discord_js_1.Partials.Channel, discord_js_1.Partials.Reaction],
});
client.once(discord_js_1.Events.ClientReady, async () => {
    console.log(`Discord bot is ready! 🤖`);
    console.log(`Logged in as ${client.user.tag}!`);
    client.user?.setActivity('Activity', { type: 3 });
    console.log("Started refreshing application (/) commands.");
    await (0, deploy_commands_1.deployCommands)();
    (0, scheduler_1.startScheduledJobs)(client);
    console.log("스케줄러가 시작되었습니다.");
});
client.on(discord_js_1.Events.InteractionCreate, async (interaction) => {
    try {
        if (!interaction.isChatInputCommand())
            return;
        const command = commands_1.commands[interaction.commandName];
        if (!command)
            return;
        await command.execute(interaction).catch(async (error) => {
            console.error(`Error executing command ${interaction.commandName}:`, error);
            const replyMethod = interaction.replied ? 'followUp' : 'reply';
            await interaction[replyMethod]({
                content: '명령어 실행 중 오류가 발생했습니다.',
                ephemeral: true
            });
        });
    }
    catch (error) {
        console.error('Error handling interaction:', error);
    }
});
client.on(discord_js_1.Events.MessageCreate, messageCreate_1.handleMessageCreate);
client.on(discord_js_1.Events.GuildMemberAdd, guildMemberAdd_1.handleGuildMemberAdd);
client.on(discord_js_1.Events.GuildMemberRemove, guildMemberRemove_1.handleGuildMemberRemove);
client.on(discord_js_1.Events.MessageReactionAdd, messageReactionAdd_1.handleMessageReactionAdd);
client.on(discord_js_1.Events.MessageReactionRemove, messageReactionRemove_1.handleMessageReactionRemove);
client.login(config_1.config.DISCORD_TOKEN).then(() => {
    console.log("봇이 시작되었습니다.");
});
