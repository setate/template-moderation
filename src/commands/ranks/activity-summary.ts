import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
} from 'discord.js';
import { db } from '../../services/database';
import { RANKS } from '../../services/ranking';
import { PRIVATE_RESPONSE_FLAGS, withPrivateNotice } from '../../utils/private-response';

export const data = new SlashCommandBuilder()
    .setName('activity-summary')
    .setNameLocalizations({ ko: '전체통계' })
    .setDescription('Show server-wide activity and rank statistics')
    .setDescriptionLocalizations({ ko: '서버 전체의 활동량과 등급 통계를 보여줍니다' });

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
        return interaction.reply({ content: withPrivateNotice('서버에서만 사용할 수 있습니다.'), flags: PRIVATE_RESPONSE_FLAGS });
    }

    await interaction.deferReply({ flags: PRIVATE_RESPONSE_FLAGS });
    const guild = interaction.guild;
    const activities = await db.memberActivity.findMany({ where: { guildId: guild.id } });
    const active = activities.filter(activity => activity.messageCount > 0);
    const totalMessages = active.reduce((sum, activity) => sum + activity.messageCount, 0);

    const members = await guild.members.fetch().catch(() => guild.members.cache);
    const rankLines = RANKS.map(rank => {
        const role = guild.roles.cache.find(candidate => candidate.name === rank.name);
        const count = role
            ? members.filter(member => !member.user.bot && member.roles.cache.has(role.id)).size
            : 0;
        return `${rank.name}: **${count.toLocaleString()}명**`;
    });
    const latestUpdate = activities
        .map(activity => Date.parse(activity.updatedAt))
        .filter(timestamp => Number.isFinite(timestamp))
        .sort((a, b) => b - a)[0];
    const updatedText = latestUpdate
        ? `<t:${Math.floor(latestUpdate / 1000)}:R>`
        : '집계 기록 없음';

    return interaction.editReply({
        content: withPrivateNotice([
            `## 📈 ${guild.name} 전체 통계`,
            `서버 멤버: **${guild.memberCount.toLocaleString()}명**`,
            `집계된 활동 사용자: **${active.length.toLocaleString()}명**`,
            `집계 메시지: **${totalMessages.toLocaleString()}개**`,
            '',
            '**등급별 현재 인원**',
            ...rankLines,
            '',
            `최근 통계 갱신: ${updatedText}`,
        ].join('\n')),
        allowedMentions: { parse: [] },
    });
}
