import { GuildMember } from 'discord.js';

export interface RankDefinition {
    name: '새내기' | '학사' | '석사' | '박사';
    minDays: number;
    minMessages: number;
}

export const RANKS: readonly RankDefinition[] = [
    { name: '새내기', minDays: 0, minMessages: 0 },
    { name: '학사', minDays: 7, minMessages: 50 },
    { name: '석사', minDays: 30, minMessages: 300 },
    { name: '박사', minDays: 90, minMessages: 1000 },
] as const;

export function getTenureDays(member: GuildMember): number {
    if (!member.joinedTimestamp) return 0;
    return Math.max(0, Math.floor((Date.now() - member.joinedTimestamp) / 86_400_000));
}

export function getEligibleRank(days: number, messageCount: number): RankDefinition {
    return [...RANKS]
        .reverse()
        .find(rank => days >= rank.minDays && messageCount >= rank.minMessages) || RANKS[0];
}

export function getNextRank(days: number, messageCount: number): RankDefinition | null {
    const eligible = getEligibleRank(days, messageCount);
    const index = RANKS.findIndex(rank => rank.name === eligible.name);
    return RANKS[index + 1] || null;
}

export async function syncMemberRank(member: GuildMember, messageCount: number): Promise<boolean> {
    if (member.user.bot) return false;

    const eligibleRank = getEligibleRank(getTenureDays(member), messageCount);
    const rankRoles = RANKS
        .map(rank => member.guild.roles.cache.find(role => role.name === rank.name))
        .filter(role => role !== undefined);
    const currentRankIndexes = RANKS
        .map((rank, index) => ({ index, role: member.guild.roles.cache.find(role => role.name === rank.name) }))
        .filter(item => item.role && member.roles.cache.has(item.role.id))
        .map(item => item.index);
    const currentHighestIndex = currentRankIndexes.length > 0 ? Math.max(...currentRankIndexes) : -1;
    const eligibleIndex = RANKS.findIndex(rank => rank.name === eligibleRank.name);
    const targetIndex = Math.max(currentHighestIndex, eligibleIndex);
    const targetRank = RANKS[targetIndex];
    const targetRole = member.guild.roles.cache.find(role => role.name === targetRank.name);

    if (!targetRole) {
        console.warn(`[ranking] 역할을 찾을 수 없습니다: ${targetRank.name} (${member.guild.name})`);
        return false;
    }

    let changed = false;
    if (!member.roles.cache.has(targetRole.id)) {
        await member.roles.add(targetRole, '서버 체류기간 및 메시지 활동량 자동 등급');
        changed = true;
    }

    const rolesToRemove = rankRoles.filter(
        role => role.id !== targetRole.id && member.roles.cache.has(role.id)
    );
    if (rolesToRemove.length > 0) {
        await member.roles.remove(rolesToRemove, '자동 등급 중복 정리');
        changed = true;
    }

    if (changed) {
        console.log(`[ranking] ${member.user.tag}: ${targetRank.name} (${messageCount} messages)`);
    }
    return changed;
}
