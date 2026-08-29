"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatPromotionDisplayName = formatPromotionDisplayName;
exports.buildPromotionRegistrationNotice = buildPromotionRegistrationNotice;
exports.replacePromotionUserMentions = replacePromotionUserMentions;
const discord_js_1 = require("discord.js");
function formatPromotionDisplayName(displayName) {
    return `**${(0, discord_js_1.escapeMarkdown)(displayName)}**`;
}
function buildPromotionRegistrationNotice(registrarName, authorName, isSelfRegistration) {
    const registrar = formatPromotionDisplayName(registrarName);
    if (isSelfRegistration) {
        return `📢 ${registrar}님이 홍보로 등록했습니다.`;
    }
    return `📢 관리자 ${registrar}님이 ${formatPromotionDisplayName(authorName)}님의 메시지를 홍보로 등록했습니다.`;
}
function replacePromotionUserMentions(content, displayNames) {
    return content.replace(/<@!?(\d+)>/g, (mention, userId) => {
        const displayName = displayNames.get(userId);
        return displayName ? formatPromotionDisplayName(displayName) : mention;
    });
}
