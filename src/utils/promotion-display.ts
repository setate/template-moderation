import { escapeMarkdown } from "discord.js";

export function formatPromotionDisplayName(displayName: string): string {
    return `**${escapeMarkdown(displayName)}**`;
}

export function buildPromotionRegistrationNotice(
    registrarName: string,
    authorName: string,
    isSelfRegistration: boolean
): string {
    const registrar = formatPromotionDisplayName(registrarName);
    if (isSelfRegistration) {
        return `📢 ${registrar}님이 홍보로 등록했습니다.`;
    }

    return `📢 관리자 ${registrar}님이 ${formatPromotionDisplayName(authorName)}님의 메시지를 홍보로 등록했습니다.`;
}

export function replacePromotionUserMentions(
    content: string,
    displayNames: ReadonlyMap<string, string>
): string {
    return content.replace(/<@!?(\d+)>/g, (mention, userId: string) => {
        const displayName = displayNames.get(userId);
        return displayName ? formatPromotionDisplayName(displayName) : mention;
    });
}
