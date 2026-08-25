import {
    ChatInputCommandInteraction,
    escapeMarkdown,
    GuildMember,
    SlashCommandBuilder,
} from 'discord.js';
import { db } from '../../services/database';
import { getTenureDays } from '../../services/ranking';
import { withPrivateNotice } from '../../utils/private-response';

export const data = new SlashCommandBuilder()
    .setName('activity-leaderboard')
    .setNameLocalizations({ ko: '활동순위' })
    .setDescription('Show the top 20 members by counted messages')
    .setDescriptionLocalizations({ ko: '집계된 메시지 수 기준 상위 20명을 보여줍니다' });

function formatMemberName(member: GuildMember): string {
    const displayName = escapeMarkdown(member.displayName);
    const username = escapeMarkdown(member.user.username);

    return member.displayName === member.user.username
        ? `**${displayName}**`
        : `**${displayName}** (@${username})`;
}

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
        return interaction.reply({ content: withPrivateNotice('서버에서만 사용할 수 있습니다.'), ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });
    const guild = interaction.guild;
    const activities = await db.memberActivity.findMany({ where: { guildId: guild.id } });
    const members = await guild.members.fetch();
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

    const medal = ['🥇', '🥈', '🥉'];
    const lines = top.map(({ activity, member }, index) => {
        const rank = medal[index] || `**${index + 1}.**`;
        const tenureDays = getTenureDays(member);
        return `${rank} ${formatMemberName(member)} — **${activity.messageCount.toLocaleString()}개** · 체류 **${tenureDays.toLocaleString()}일**`;
    });

    return interaction.editReply({
        content: withPrivateNotice([`## 📊 활동 순위 TOP 20`, ...lines].join('\n')),
        allowedMentions: { parse: [] },
    });
}
