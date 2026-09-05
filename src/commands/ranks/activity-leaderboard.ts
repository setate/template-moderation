import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
} from 'discord.js';
import { db } from '../../services/database';
import { fetchGuildMembers } from '../../services/guild-members';
import { PRIVATE_RESPONSE_FLAGS, withPrivateNotice } from '../../utils/private-response';
import { formatActivityRankLine } from './activity-leaderboard-format';

export const data = new SlashCommandBuilder()
    .setName('activity-leaderboard')
    .setNameLocalizations({ ko: '활동순위' })
    .setDescription('Show the top 20 members by counted messages')
    .setDescriptionLocalizations({ ko: '집계된 메시지 수 기준 상위 20명을 보여줍니다' });

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
        return interaction.reply({ content: withPrivateNotice('서버에서만 사용할 수 있습니다.'), flags: PRIVATE_RESPONSE_FLAGS });
    }

    await interaction.deferReply({ flags: PRIVATE_RESPONSE_FLAGS });
    const guild = interaction.guild;
    const activities = await db.memberActivity.findMany({ where: { guildId: guild.id } });
    const members = await fetchGuildMembers(guild);
    const top = activities
        .flatMap(activity => {
            const member = members.get(activity.userId);
            return member && !member.user.bot && activity.messageCount > 0
                ? [{ activity, member }]
                : [];
        })
        .sort((a, b) =>
            b.activity.messageCount - a.activity.messageCount
            || a.activity.userId.localeCompare(b.activity.userId)
        )
        .slice(0, 20);

    if (top.length === 0) {
        return interaction.editReply(withPrivateNotice('아직 집계된 메시지가 없습니다. 관리자가 `/활동통계수집`을 먼저 실행해 주세요.'));
    }

    const lines = top.map(({ activity, member }, index) =>
        formatActivityRankLine(member, activity.messageCount, index)
    );

    return interaction.editReply({
        content: withPrivateNotice([`## 📊 활동 순위 TOP 20`, ...lines].join('\n')),
        allowedMentions: { parse: [] },
    });
}
