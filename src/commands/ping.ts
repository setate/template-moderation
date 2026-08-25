import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { PRIVATE_RESPONSE_FLAGS, withPrivateNotice } from '../utils/private-response';

// 명령어 정의
export const data = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('ping')

/**
 * ping 명령어 실행
 */
export async function execute(interaction: ChatInputCommandInteraction) {
    return interaction.reply({ content: withPrivateNotice('pong! 🏓'), flags: PRIVATE_RESPONSE_FLAGS });
}
