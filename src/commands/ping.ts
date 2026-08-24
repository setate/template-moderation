import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { withPrivateNotice } from '../utils/private-response';

// 명령어 정의
export const data = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('ping')

/**
 * ping 명령어 실행
 */
export async function execute(interaction: ChatInputCommandInteraction) {
    return interaction.reply({ content: withPrivateNotice('pong! 🏓'), ephemeral: true });
}
