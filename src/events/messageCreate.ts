import { Message } from 'discord.js';
import { recordMessage } from '../services/activity';
import { syncMemberRank } from '../services/ranking';

/**
 * 메시지 생성 이벤트 처리
 * @param message Discord 메시지
 */
export async function handleMessageCreate(message: Message): Promise<void> {
    if (!message.guild || message.author.bot) return;

    try {
        const activity = await recordMessage(message.guild.id, message.author.id, message.createdAt);
        const member = message.member || await message.guild.members.fetch(message.author.id);
        await syncMemberRank(member, activity.messageCount);
    } catch (error) {
        console.error('[activity] 메시지 활동량 집계 실패:', error);
    }
}
