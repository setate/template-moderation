import { escapeMarkdown, GuildMember } from "discord.js";
import { getTenureDays } from "../../services/ranking";

const MEDALS = ["🥇", "🥈", "🥉"];

export function formatActivityRankLine(
    member: GuildMember,
    messageCount: number,
    index: number
): string {
    const rank = MEDALS[index] || `**${index + 1}.**`;
    const colorRole = member.roles.color;
    const colorRoleTag = colorRole ? ` ${colorRole.toString()}` : "";
    const displayName = escapeMarkdown(member.displayName);
    const tenureDays = getTenureDays(member);

    return `${rank} **${displayName}**${colorRoleTag} — **${messageCount.toLocaleString()}개** · 체류 **${tenureDays.toLocaleString()}일**`;
}
