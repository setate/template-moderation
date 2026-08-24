"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const database_1 = require("../../services/database");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('activity-leaderboard')
    .setNameLocalizations({ ko: '활동순위' })
    .setDescription('Show the top 20 members by counted messages')
    .setDescriptionLocalizations({ ko: '집계된 메시지 수 기준 상위 20명을 보여줍니다' });
async function execute(interaction) {
    if (!interaction.guild) {
        return interaction.reply({ content: '서버에서만 사용할 수 있습니다.', ephemeral: true });
    }
    await interaction.deferReply();
    const activities = await database_1.db.memberActivity.findMany({ where: { guildId: interaction.guild.id } });
    const top = activities
        .filter(activity => activity.messageCount > 0)
        .sort((a, b) => b.messageCount - a.messageCount || a.userId.localeCompare(b.userId))
        .slice(0, 20);
    if (top.length === 0) {
        return interaction.editReply('아직 집계된 메시지가 없습니다. 관리자가 `/활동통계수집`을 먼저 실행해 주세요.');
    }
    const medal = ['🥇', '🥈', '🥉'];
    const lines = top.map((activity, index) => {
        const rank = medal[index] || `**${index + 1}.**`;
        return `${rank} <@${activity.userId}> — **${activity.messageCount.toLocaleString()}개**`;
    });
    return interaction.editReply({
        content: [`## 📊 활동 순위 TOP 20`, ...lines].join('\n'),
        allowedMentions: { users: [] },
    });
}
