import { Client } from 'discord.js';
import { db } from './services/database';
import { fetchGuildMembers } from './services/guild-members';
import { syncMemberRank } from './services/ranking';

const SIX_HOURS = 6 * 60 * 60 * 1000;

async function syncAllGuildRanks(client: Client): Promise<void> {
    for (const discordGuild of client.guilds.cache.values()) {
        try {
            await discordGuild.roles.fetch();
            const members = await fetchGuildMembers(discordGuild);
            const activities = await db.memberActivity.findMany({ where: { guildId: discordGuild.id } });
            const counts = new Map(activities.map(activity => [activity.userId, activity.messageCount]));

            for (const member of members.values()) {
                await syncMemberRank(member, counts.get(member.id) || 0);
            }
        } catch (error) {
            console.error(`[ranking] ${discordGuild.name} 정기 등급 점검 실패:`, error);
        }
    }
}

export function startScheduledJobs(client: Client) {
    setTimeout(() => {
        syncAllGuildRanks(client).catch(error => console.error('[ranking] 초기 등급 점검 실패:', error));
    }, 30_000);

    setInterval(() => {
        syncAllGuildRanks(client).catch(error => console.error('[ranking] 정기 등급 점검 실패:', error));
    }, SIX_HOURS);
}
