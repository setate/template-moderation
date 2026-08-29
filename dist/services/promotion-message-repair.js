"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.repairLegacyPromotionMessages = repairLegacyPromotionMessages;
const database_1 = require("./database");
const guild_members_1 = require("./guild-members");
const promotion_display_1 = require("../utils/promotion-display");
const USER_MENTION_PATTERN = /<@!?(\d+)>/g;
const PROMOTER_FIELD_PATTERN = /^<@!?(\d+)>$/;
const PROMOTER_FIELD_NAME = "홍보자";
function mentionIds(content) {
    return [...content.matchAll(USER_MENTION_PATTERN)].map(match => match[1]);
}
async function resolveDisplayName(client, members, userId) {
    const member = members.get(userId);
    if (member)
        return member.displayName;
    const cachedUser = client.users.cache.get(userId);
    const user = cachedUser
        || await client.users.fetch(userId).catch(() => undefined);
    return user?.globalName || user?.username;
}
async function repairNoticeMessage(client, members, post) {
    if (!post.noticeMessageId)
        return false;
    const channel = await client.channels.fetch(post.channelId);
    if (!channel?.isTextBased() || channel.isDMBased())
        return false;
    const message = await channel.messages.fetch(post.noticeMessageId);
    const ids = [...new Set(mentionIds(message.content))];
    if (!ids.length)
        return false;
    const resolvedNames = await Promise.all(ids.map(async (userId) => [
        userId,
        await resolveDisplayName(client, members, userId),
    ]));
    const displayNames = new Map(resolvedNames.filter((entry) => Boolean(entry[1])));
    const content = (0, promotion_display_1.replacePromotionUserMentions)(message.content, displayNames);
    if (content === message.content)
        return false;
    await message.edit({ content, allowedMentions: { parse: [] } });
    return true;
}
async function repairCardMessage(client, members, post) {
    if (post.noticeMessageId)
        return false;
    const channel = await client.channels.fetch(post.channelId);
    if (!channel?.isTextBased() || channel.isDMBased())
        return false;
    const message = await channel.messages.fetch(post.messageId);
    const displayName = await resolveDisplayName(client, members, post.userId);
    if (!displayName)
        return false;
    let changed = false;
    const embeds = message.embeds.map(embed => {
        const data = embed.toJSON();
        data.fields = data.fields?.map(field => {
            if (field.name !== PROMOTER_FIELD_NAME || !PROMOTER_FIELD_PATTERN.test(field.value)) {
                return field;
            }
            changed = true;
            return { ...field, value: (0, promotion_display_1.formatPromotionDisplayName)(displayName) };
        });
        return data;
    });
    if (!changed)
        return false;
    await message.edit({ embeds, allowedMentions: { parse: [] } });
    return true;
}
async function repairLegacyPromotionMessages(client) {
    let repairedCount = 0;
    for (const guild of client.guilds.cache.values()) {
        const posts = await database_1.db.promotionPost.findMany({
            guildId: guild.id,
            limit: Number.MAX_SAFE_INTEGER,
        });
        if (!posts.length)
            continue;
        let members;
        try {
            members = await (0, guild_members_1.fetchGuildMembers)(guild);
        }
        catch (error) {
            console.warn(`[홍보] ${guild.name} 멤버 이름 불러오기 실패:`, error);
            continue;
        }
        for (const post of posts) {
            try {
                const repaired = post.noticeMessageId
                    ? await repairNoticeMessage(client, members, post)
                    : await repairCardMessage(client, members, post);
                if (repaired)
                    repairedCount += 1;
            }
            catch (error) {
                const code = error.code;
                if (code === 10003 || code === 10008)
                    continue;
                console.warn(`[홍보] 기존 메시지 수정 실패 (${post.messageId}):`, error);
            }
        }
    }
    return repairedCount;
}
