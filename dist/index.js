"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const config_1 = require("./config");
const commands_1 = require("./commands");
const deploy_commands_1 = require("./deploy-commands");
const scheduler_1 = require("./scheduler");
const promotion_message_repair_1 = require("./services/promotion-message-repair");
const private_response_1 = require("./utils/private-response");
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
async function sendCommandError(interaction) {
    const content = (0, private_response_1.withPrivateNotice)('명령어 실행 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    try {
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content, embeds: [], components: [] });
        }
        else {
            await interaction.reply({ content, flags: private_response_1.PRIVATE_RESPONSE_FLAGS });
        }
    }
    catch (error) {
        console.error(`[command] ${interaction.commandName} 오류 응답 전송 실패:`, error);
    }
}
client.once(discord_js_1.Events.ClientReady, async () => {
    console.log(`Discord bot is ready! 🤖`);
    console.log(`Logged in as ${client.user.tag}!`);
    client.user?.setActivity('Activity', { type: 3 });
    console.log("Started refreshing application (/) commands.");
    await (0, deploy_commands_1.deployCommands)();
    try {
        const repairedCount = await (0, promotion_message_repair_1.repairLegacyPromotionMessages)(client);
        if (repairedCount > 0) {
            console.log(`기존 홍보 메시지 ${repairedCount}개의 사용자 표시를 수정했습니다.`);
        }
    }
    catch (error) {
        console.warn("기존 홍보 메시지 수정 중 오류가 발생했습니다:", error);
    }
    (0, scheduler_1.startScheduledJobs)(client);
    console.log("스케줄러가 시작되었습니다.");
});
client.on(discord_js_1.Events.InteractionCreate, async (interaction) => {
    try {
        if (!interaction.isChatInputCommand() && !interaction.isMessageContextMenuCommand())
            return;
        const command = commands_1.commands[interaction.commandName];
        if (!command)
            return;
        try {
            const execute = command.execute;
            await execute(interaction);
        }
        catch (error) {
            console.error(`Error executing command ${interaction.commandName}:`, error);
            await sendCommandError(interaction);
        }
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
