"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startScheduledJobs = startScheduledJobs;
const database_1 = require("./services/database");
const guild_members_1 = require("./services/guild-members");
const ranking_1 = require("./services/ranking");
const SIX_HOURS = 6 * 60 * 60 * 1000;
async function syncAllGuildRanks(client) {
    for (const discordGuild of client.guilds.cache.values()) {
        try {
            await discordGuild.roles.fetch();
            const members = await (0, guild_members_1.fetchGuildMembers)(discordGuild);
            const activities = await database_1.db.memberActivity.findMany({ where: { guildId: discordGuild.id } });
            const counts = new Map(activities.map(activity => [activity.userId, activity.messageCount]));
            for (const member of members.values()) {
                await (0, ranking_1.syncMemberRank)(member, counts.get(member.id) || 0);
            }
        }
        catch (error) {
            console.error(`[ranking] ${discordGuild.name} 정기 등급 점검 실패:`, error);
        }
    }
}
function startScheduledJobs(client) {
    setTimeout(() => {
        syncAllGuildRanks(client).catch(error => console.error('[ranking] 초기 등급 점검 실패:', error));
    }, 30000);
    setInterval(() => {
        syncAllGuildRanks(client).catch(error => console.error('[ranking] 정기 등급 점검 실패:', error));
    }, SIX_HOURS);
}
