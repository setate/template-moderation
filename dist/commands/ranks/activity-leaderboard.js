"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const database_1 = require("../../services/database");
const guild_members_1 = require("../../services/guild-members");
const private_response_1 = require("../../utils/private-response");
const activity_leaderboard_format_1 = require("./activity-leaderboard-format");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('activity-leaderboard')
    .setNameLocalizations({ ko: '활동순위' })
    .setDescription('Show the top 20 members by counted messages')
    .setDescriptionLocalizations({ ko: '집계된 메시지 수 기준 상위 20명을 보여줍니다' });
async function execute(interaction) {
    if (!interaction.guild) {
        return interaction.reply({ content: (0, private_response_1.withPrivateNotice)('서버에서만 사용할 수 있습니다.'), flags: private_response_1.PRIVATE_RESPONSE_FLAGS });
    }
    await interaction.deferReply({ flags: private_response_1.PRIVATE_RESPONSE_FLAGS });
    const guild = interaction.guild;
    const activities = await database_1.db.memberActivity.findMany({ where: { guildId: guild.id } });
    const members = await (0, guild_members_1.fetchGuildMembers)(guild);
    const top = activities
        .flatMap(activity => {
        const member = members.get(activity.userId);
        return member && !member.user.bot && activity.messageCount > 0
            ? [{ activity, member }]
            : [];
    })
        .sort((a, b) => b.activity.messageCount - a.activity.messageCount
        || a.activity.userId.localeCompare(b.activity.userId))
        .slice(0, 20);
    if (top.length === 0) {
        return interaction.editReply((0, private_response_1.withPrivateNotice)('아직 집계된 메시지가 없습니다. 관리자가 `/활동통계수집`을 먼저 실행해 주세요.'));
    }
    const lines = top.map(({ activity, member }, index) => (0, activity_leaderboard_format_1.formatActivityRankLine)(member, activity.messageCount, index));
    return interaction.editReply({
        content: (0, private_response_1.withPrivateNotice)([`## 📊 활동 순위 TOP 20`, ...lines].join('\n')),
        allowedMentions: { parse: [] },
    });
}
