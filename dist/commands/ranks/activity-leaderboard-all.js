"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const database_1 = require("../../services/database");
const guild_members_1 = require("../../services/guild-members");
const ranking_1 = require("../../services/ranking");
const private_response_1 = require("../../utils/private-response");
const PAGE_SIZE = 15;
const MENU_TIMEOUT_MS = 5 * 60 * 1000;
const PREVIOUS_PAGE_ID = "activity-leaderboard-all-previous";
const NEXT_PAGE_ID = "activity-leaderboard-all-next";
function buildPageButtons(page, pageCount, disabled = false) {
    const previous = new discord_js_1.ButtonBuilder()
        .setCustomId(PREVIOUS_PAGE_ID)
        .setLabel("이전")
        .setStyle(discord_js_1.ButtonStyle.Secondary)
        .setDisabled(disabled || page === 0);
    const next = new discord_js_1.ButtonBuilder()
        .setCustomId(NEXT_PAGE_ID)
        .setLabel("다음")
        .setStyle(discord_js_1.ButtonStyle.Primary)
        .setDisabled(disabled || page >= pageCount - 1);
    return new discord_js_1.ActionRowBuilder().addComponents(previous, next);
}
function buildPageContent(ranking, page) {
    const pageCount = Math.max(1, Math.ceil(ranking.length / PAGE_SIZE));
    const start = page * PAGE_SIZE;
    const lines = ranking.slice(start, start + PAGE_SIZE).map(({ member, messageCount }, index) => {
        const position = start + index + 1;
        const colorRole = member.roles.color;
        const colorRoleTag = colorRole ? ` ${colorRole.toString()}` : "";
        const displayName = (0, discord_js_1.escapeMarkdown)(member.displayName);
        const tenureDays = (0, ranking_1.getTenureDays)(member);
        return `**${position}. ${displayName}**${colorRoleTag} — **${messageCount.toLocaleString()}개** · 체류 **${tenureDays.toLocaleString()}일**`;
    });
    return (0, private_response_1.withPrivateNotice)([
        "## 📋 전체 활동 순위",
        ...lines,
        "",
        `페이지 **${page + 1}/${pageCount}** · 일반 멤버 **${ranking.length.toLocaleString()}명**`,
    ].join("\n"));
}
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName("activity-leaderboard-all")
    .setNameLocalizations({ ko: "전체활동순위" })
    .setDescription("Show activity statistics for every non-bot member")
    .setDescriptionLocalizations({ ko: "모든 일반 멤버의 메시지 수와 체류기간을 순위로 보여줍니다" })
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageGuild);
async function execute(interaction) {
    if (!interaction.guild) {
        return interaction.reply({
            content: (0, private_response_1.withPrivateNotice)("서버에서만 사용할 수 있습니다."),
            flags: private_response_1.PRIVATE_RESPONSE_FLAGS,
        });
    }
    if (!interaction.memberPermissions?.has(discord_js_1.PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
            content: (0, private_response_1.withPrivateNotice)("서버 관리 권한이 있는 관리자만 사용할 수 있습니다."),
            flags: private_response_1.PRIVATE_RESPONSE_FLAGS,
        });
    }
    await interaction.deferReply({ flags: private_response_1.PRIVATE_RESPONSE_FLAGS });
    const guild = interaction.guild;
    const [activities, members] = await Promise.all([
        database_1.db.memberActivity.findMany({ where: { guildId: guild.id } }),
        (0, guild_members_1.fetchGuildMembers)(guild),
    ]);
    const counts = new Map(activities.map(activity => [activity.userId, activity.messageCount]));
    const ranking = members
        .filter(member => !member.user.bot)
        .map(member => ({ member, messageCount: counts.get(member.id) || 0 }))
        .sort((a, b) => b.messageCount - a.messageCount
        || a.member.id.localeCompare(b.member.id));
    if (ranking.length === 0) {
        return interaction.editReply((0, private_response_1.withPrivateNotice)("표시할 일반 멤버가 없습니다."));
    }
    let page = 0;
    const pageCount = Math.ceil(ranking.length / PAGE_SIZE);
    const reply = await interaction.editReply({
        content: buildPageContent(ranking, page),
        components: [buildPageButtons(page, pageCount)],
        allowedMentions: { parse: [] },
    });
    const collector = reply.createMessageComponentCollector({
        filter: component => component.user.id === interaction.user.id
            && (component.customId === PREVIOUS_PAGE_ID || component.customId === NEXT_PAGE_ID),
        time: MENU_TIMEOUT_MS,
    });
    collector.on("collect", async (component) => {
        try {
            await component.deferUpdate();
            page = component.customId === NEXT_PAGE_ID
                ? Math.min(page + 1, pageCount - 1)
                : Math.max(page - 1, 0);
            await interaction.editReply({
                content: buildPageContent(ranking, page),
                components: [buildPageButtons(page, pageCount)],
                allowedMentions: { parse: [] },
            });
        }
        catch (error) {
            console.error("[activity-leaderboard-all] 페이지 변경 실패:", error);
            collector.stop("error");
        }
    });
    collector.on("end", async () => {
        await interaction.editReply({
            content: buildPageContent(ranking, page),
            components: [buildPageButtons(page, pageCount, true)],
            allowedMentions: { parse: [] },
        }).catch(() => undefined);
    });
}
