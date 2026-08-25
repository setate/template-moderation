import {
    ChatInputCommandInteraction,
    Client,
    Events,
    GatewayIntentBits,
    MessageContextMenuCommandInteraction,
    Partials,
} from "discord.js";
import { config } from "./config";
import { commands } from "./commands";
import { deployCommands } from "./deploy-commands";
import { startScheduledJobs } from "./scheduler";
import { PRIVATE_RESPONSE_FLAGS, withPrivateNotice } from "./utils/private-response";

// Event handlers
import { handleMessageCreate } from "./events/messageCreate";
import { handleGuildMemberAdd } from "./events/guildMemberAdd";
import { handleGuildMemberRemove } from "./events/guildMemberRemove";
import { handleMessageReactionAdd } from "./events/messageReactionAdd";
import { handleMessageReactionRemove } from "./events/messageReactionRemove";

// 클라이언트 생성
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

type SupportedCommandInteraction = ChatInputCommandInteraction | MessageContextMenuCommandInteraction;

async function sendCommandError(interaction: SupportedCommandInteraction): Promise<void> {
    const content = withPrivateNotice('명령어 실행 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');

    try {
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content, embeds: [], components: [] });
        } else {
            await interaction.reply({ content, flags: PRIVATE_RESPONSE_FLAGS });
        }
    } catch (error) {
        console.error(`[command] ${interaction.commandName} 오류 응답 전송 실패:`, error);
    }
}

// 봇이 준비되었을 때의 이벤트 핸들러
client.once(Events.ClientReady, async () => {
    console.log(`Discord bot is ready! 🤖`);
    console.log(`Logged in as ${client.user!.tag}!`);

    // 활동 상태 설정
    client.user?.setActivity('Activity', { type: 3 }); // 3: Watching

    // 명령어 갱신
    console.log("Started refreshing application (/) commands.");
    await deployCommands();

    // 스케줄러 시작
    startScheduledJobs(client);
    console.log("스케줄러가 시작되었습니다.");
});

// 인터랙션 핸들러
client.on(Events.InteractionCreate, async (interaction) => {
    try {
        // 슬래시 명령어와 메시지 우클릭/길게 누르기 메뉴를 처리합니다.
        if (!interaction.isChatInputCommand() && !interaction.isMessageContextMenuCommand()) return;

        const command = commands[interaction.commandName as keyof typeof commands];
        if (!command) return;

        // 옵션 처리를 포함한 명령어 실행
        try {
            const execute = command.execute as (commandInteraction: SupportedCommandInteraction) => Promise<unknown>;
            await execute(interaction);
        } catch (error) {
            console.error(`Error executing command ${interaction.commandName}:`, error);
            await sendCommandError(interaction);
        }

    } catch (error) {
        console.error('Error handling interaction:', error);
    }
});

// 이벤트 리스너
client.on(Events.MessageCreate, handleMessageCreate);
client.on(Events.GuildMemberAdd, handleGuildMemberAdd);
client.on(Events.GuildMemberRemove, handleGuildMemberRemove);
client.on(Events.MessageReactionAdd, handleMessageReactionAdd);
client.on(Events.MessageReactionRemove, handleMessageReactionRemove);

// 봇 로그인
client.login(config.DISCORD_TOKEN).then(() => {
    console.log("봇이 시작되었습니다.");
});
