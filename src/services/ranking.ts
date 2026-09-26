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

const memberRankSyncs = new Map<string, Promise<boolean>>();

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

async function syncMemberRankNow(member: GuildMember, messageCount: number): Promise<boolean> {
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
    let updatedMember = member;
    if (!updatedMember.roles.cache.has(targetRole.id)) {
        // 단일 역할 추가는 새 상태가 반영된 GuildMember 복제본을 반환합니다.
        // 이 반환값을 사용해야 바로 뒤의 역할 정리가 오래된 캐시를 사용하지 않습니다.
        updatedMember = await updatedMember.roles.add(
            targetRole,
            '서버 체류기간 및 메시지 활동량 자동 등급'
        );
        changed = true;
    }

    const rolesToRemove = rankRoles.filter(
        role => role.id !== targetRole.id && updatedMember.roles.cache.has(role.id)
    );

    // 여러 역할을 배열로 한꺼번에 remove하면 discord.js가 오래된 전체 역할 목록으로
    // PATCH하여 방금 추가한 등급까지 누락시킬 수 있습니다. 단일 DELETE를 순서대로
    // 사용하면 목표 등급은 그대로 둔 채 이전 등급만 안전하게 제거할 수 있습니다.
    for (const role of rolesToRemove) {
        if (!updatedMember.roles.cache.has(targetRole.id)) {
            throw new Error(`목표 등급 역할이 확인되지 않아 이전 역할 제거를 중단했습니다: ${targetRank.name}`);
        }
        updatedMember = await updatedMember.roles.remove(role, '자동 등급 중복 정리');
        changed = true;
    }

    if (!updatedMember.roles.cache.has(targetRole.id)) {
        throw new Error(`등급 동기화 후 목표 역할이 없습니다: ${targetRank.name}`);
    }

    if (changed) {
        console.log(`[ranking] ${member.user.tag}: ${targetRank.name} (${messageCount} messages)`);
    }
    return changed;
}

export async function syncMemberRank(member: GuildMember, messageCount: number): Promise<boolean> {
    if (member.user.bot) return false;

    // 메시지 승급과 정기 점검이 겹치면 서로가 부여한 역할을 지울 수 있다.
    // 같은 멤버의 역할 변경은 항상 하나씩 순서대로 실행한다.
    const memberKey = `${member.guild.id}:${member.id}`;
    const previousSync = memberRankSyncs.get(memberKey) || Promise.resolve(false);
    const currentSync = previousSync
        .catch(() => false)
        .then(() => syncMemberRankNow(member, messageCount));

    memberRankSyncs.set(memberKey, currentSync);

    try {
        return await currentSync;
    } finally {
        if (memberRankSyncs.get(memberKey) === currentSync) {
            memberRankSyncs.delete(memberKey);
        }
    }
}
