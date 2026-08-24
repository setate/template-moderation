import {
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from 'discord.js';
import { db } from '../../services/database';
import { getEligibleRank, getNextRank, getTenureDays } from '../../services/ranking';
import { withPrivateNotice } from '../../utils/private-response';

export const data = new SlashCommandBuilder()
    .setName('rank-status')
    .setNameLocalizations({ ko: '등급현황' })
    .setDescription('Show server tenure and message activity rank progress')
    .setDescriptionLocalizations({ ko: '서버 체류기간과 메시지 활동 등급 현황을 확인합니다' })
    .addUserOption(option =>
        option
            .setName('user')
            .setNameLocalizations({ ko: '사용자' })
            .setDescription('User to inspect (Manage Server permission required for others)')
            .setDescriptionLocalizations({ ko: '확인할 사용자 (다른 사용자는 서버 관리 권한 필요)' })
            .setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
        return interaction.reply({ content: withPrivateNotice('서버에서만 사용할 수 있습니다.'), ephemeral: true });
    }

    const targetUser = interaction.options.getUser('user') || interaction.user;
    if (
        targetUser.id !== interaction.user.id &&
        !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)
    ) {
        return interaction.reply({ content: withPrivateNotice('다른 사용자의 현황은 서버 관리 권한이 필요합니다.'), ephemeral: true });
    }

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
        return interaction.reply({ content: withPrivateNotice('서버 멤버를 찾을 수 없습니다.'), ephemeral: true });
    }

    const activity = await db.memberActivity.findUnique({
        where: { guildId_userId: { guildId: interaction.guild.id, userId: targetUser.id } },
    });
    const messageCount = activity?.messageCount || 0;
    const days = getTenureDays(member);
    const currentRank = getEligibleRank(days, messageCount);
    const nextRank = getNextRank(days, messageCount);
    const nextText = nextRank
        ? `다음 등급 **${nextRank.name}**까지 ${Math.max(0, nextRank.minDays - days)}일, ${Math.max(0, nextRank.minMessages - messageCount)}개 메시지 남음`
        : '최고 등급 조건을 달성했습니다.';

    return interaction.reply({
        content: withPrivateNotice([
            `**${targetUser.username}님의 등급 현황**`,
            `현재 산정 등급: **${currentRank.name}**`,
            `서버 체류: **${days}일**`,
            `메시지: **${messageCount.toLocaleString()}개**`,
            nextText,
        ].join('\n')),
        ephemeral: true,
    });
}
