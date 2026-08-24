"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMessageCreate = handleMessageCreate;
const activity_1 = require("../services/activity");
const ranking_1 = require("../services/ranking");
async function handleMessageCreate(message) {
    if (!message.guild || message.author.bot)
        return;
    try {
        const activity = await (0, activity_1.recordMessage)(message.guild.id, message.author.id, message.createdAt);
        const member = message.member || await message.guild.members.fetch(message.author.id);
        await (0, ranking_1.syncMemberRank)(member, activity.messageCount);
    }
    catch (error) {
        console.error('[activity] 메시지 활동량 집계 실패:', error);
    }
}
