"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const database_1 = require("../../services/database");
const ranking_1 = require("../../services/ranking");
const private_response_1 = require("../../utils/private-response");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('activity-summary')
    .setNameLocalizations({ ko: '전체통계' })
    .setDescription('Show server-wide activity and rank statistics')
    .setDescriptionLocalizations({ ko: '서버 전체의 활동량과 등급 통계를 보여줍니다' });
async function execute(interaction) {
    if (!interaction.guild) {
        return interaction.reply({ content: (0, private_response_1.withPrivateNotice)('서버에서만 사용할 수 있습니다.'), ephemeral: true });
    }
    await interaction.deferReply({ ephemeral: true });
    const guild = interaction.guild;
    const activities = await database_1.db.memberActivity.findMany({ where: { guildId: guild.id } });
    const active = activities.filter(activity => activity.messageCount > 0);
    const totalMessages = active.reduce((sum, activity) => sum + activity.messageCount, 0);
    const averageMessages = active.length > 0 ? Math.round(totalMessages / active.length) : 0;
    const sortedCounts = active.map(activity => activity.messageCount).sort((a, b) => a - b);
    const middle = Math.floor(sortedCounts.length / 2);
    const medianMessages = sortedCounts.length === 0
        ? 0
        : sortedCounts.length % 2 === 0
            ? Math.round((sortedCounts[middle - 1] + sortedCounts[middle]) / 2)
            : sortedCounts[middle];
    const members = await guild.members.fetch().catch(() => guild.members.cache);
    const rankLines = ranking_1.RANKS.map(rank => {
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
        content: (0, private_response_1.withPrivateNotice)([
            `## 📈 ${guild.name} 전체 통계`,
            `서버 멤버: **${guild.memberCount.toLocaleString()}명**`,
            `집계된 활동 사용자: **${active.length.toLocaleString()}명**`,
            `집계 메시지: **${totalMessages.toLocaleString()}개**`,
            `활동 사용자 평균: **${averageMessages.toLocaleString()}개**`,
            `활동 사용자 중앙값: **${medianMessages.toLocaleString()}개**`,
            '',
            '**등급별 현재 인원**',
            ...rankLines,
            '',
            `최근 통계 갱신: ${updatedText}`,
        ].join('\n')),
        allowedMentions: { parse: [] },
    });
}
