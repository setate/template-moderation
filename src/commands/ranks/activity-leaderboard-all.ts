import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    escapeMarkdown,
    GuildMember,
    SlashCommandBuilder,
} from "discord.js";
import { db } from "../../services/database";
import { fetchGuildMembers } from "../../services/guild-members";
import { getTenureDays } from "../../services/ranking";
import { hasServerAdminAccess } from "../../utils/admin-access";
import { PRIVATE_RESPONSE_FLAGS, withPrivateNotice } from "../../utils/private-response";

const PAGE_SIZE = 15;
const MENU_TIMEOUT_MS = 5 * 60 * 1000;
const PREVIOUS_PAGE_ID = "activity-leaderboard-all-previous";
const NEXT_PAGE_ID = "activity-leaderboard-all-next";

interface RankedMember {
    member: GuildMember;
    messageCount: number;
}

function buildPageButtons(page: number, pageCount: number, disabled = false) {
    const previous = new ButtonBuilder()
        .setCustomId(PREVIOUS_PAGE_ID)
        .setLabel("이전")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled || page === 0);
    const next = new ButtonBuilder()
        .setCustomId(NEXT_PAGE_ID)
        .setLabel("다음")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled || page >= pageCount - 1);

    return new ActionRowBuilder<ButtonBuilder>().addComponents(previous, next);
}

function buildPageContent(ranking: RankedMember[], page: number): string {
    const pageCount = Math.max(1, Math.ceil(ranking.length / PAGE_SIZE));
    const start = page * PAGE_SIZE;
    const lines = ranking.slice(start, start + PAGE_SIZE).map(({ member, messageCount }, index) => {
        const position = start + index + 1;
        const colorRole = member.roles.color;
        const colorRoleTag = colorRole ? ` ${colorRole.toString()}` : "";
        const displayName = escapeMarkdown(member.displayName);
        const tenureDays = getTenureDays(member);
        return `**${position}. ${displayName}**${colorRoleTag} — **${messageCount.toLocaleString()}개** · 체류 **${tenureDays.toLocaleString()}일**`;
    });

    return withPrivateNotice([
        "## 📋 전체 활동 순위",
        ...lines,
        "",
        `페이지 **${page + 1}/${pageCount}** · 일반 멤버 **${ranking.length.toLocaleString()}명**`,
    ].join("\n"));
}

export const data = new SlashCommandBuilder()
    .setName("activity-leaderboard-all")
    .setNameLocalizations({ ko: "전체활동순위" })
    .setDescription("Show activity statistics for every non-bot member")
    .setDescriptionLocalizations({ ko: "모든 일반 멤버의 메시지 수와 체류기간을 순위로 보여줍니다" });

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
        return interaction.reply({
            content: withPrivateNotice("서버에서만 사용할 수 있습니다."),
            flags: PRIVATE_RESPONSE_FLAGS,
        });
    }
    if (!await hasServerAdminAccess(interaction)) {
        return interaction.reply({
            content: withPrivateNotice("서버 관리자만 사용할 수 있습니다."),
            flags: PRIVATE_RESPONSE_FLAGS,
        });
    }

    await interaction.deferReply({ flags: PRIVATE_RESPONSE_FLAGS });
    const guild = interaction.guild;
    const [activities, members] = await Promise.all([
        db.memberActivity.findMany({ where: { guildId: guild.id } }),
        fetchGuildMembers(guild),
    ]);
    const counts = new Map(activities.map(activity => [activity.userId, activity.messageCount]));
    const ranking = members
        .filter(member => !member.user.bot)
        .map(member => ({ member, messageCount: counts.get(member.id) || 0 }))
        .sort((a, b) =>
            b.messageCount - a.messageCount
            || a.member.id.localeCompare(b.member.id)
        );

    if (ranking.length === 0) {
        return interaction.editReply(withPrivateNotice("표시할 일반 멤버가 없습니다."));
    }

    let page = 0;
    const pageCount = Math.ceil(ranking.length / PAGE_SIZE);
    const reply = await interaction.editReply({
        content: buildPageContent(ranking, page),
        components: [buildPageButtons(page, pageCount)],
        allowedMentions: { parse: [] },
    });
    const collector = reply.createMessageComponentCollector({
        filter: component =>
            component.user.id === interaction.user.id
            && (component.customId === PREVIOUS_PAGE_ID || component.customId === NEXT_PAGE_ID),
        time: MENU_TIMEOUT_MS,
    });

    collector.on("collect", async component => {
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
        } catch (error) {
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
