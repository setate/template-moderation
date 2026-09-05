"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatActivityRankLine = formatActivityRankLine;
const discord_js_1 = require("discord.js");
const ranking_1 = require("../../services/ranking");
const MEDALS = ["🥇", "🥈", "🥉"];
function formatActivityRankLine(member, messageCount, index) {
    const rank = MEDALS[index] || `**${index + 1}.**`;
    const colorRole = member.roles.color;
    const colorRoleTag = colorRole ? ` ${colorRole.toString()}` : "";
    const displayName = (0, discord_js_1.escapeMarkdown)(member.displayName);
    const tenureDays = (0, ranking_1.getTenureDays)(member);
    return `${rank} **${displayName}**${colorRoleTag} — **${messageCount.toLocaleString()}개** · 체류 **${tenureDays.toLocaleString()}일**`;
}
