"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RANKS = void 0;
exports.getTenureDays = getTenureDays;
exports.getEligibleRank = getEligibleRank;
exports.getNextRank = getNextRank;
exports.syncMemberRank = syncMemberRank;
exports.RANKS = [
    { name: '새내기', minDays: 0, minMessages: 0 },
    { name: '학사', minDays: 7, minMessages: 50 },
    { name: '석사', minDays: 30, minMessages: 300 },
    { name: '박사', minDays: 90, minMessages: 1000 },
];
const memberRankSyncs = new Map();
function getTenureDays(member) {
    if (!member.joinedTimestamp)
        return 0;
    return Math.max(0, Math.floor((Date.now() - member.joinedTimestamp) / 86400000));
}
function getEligibleRank(days, messageCount) {
    return [...exports.RANKS]
        .reverse()
        .find(rank => days >= rank.minDays && messageCount >= rank.minMessages) || exports.RANKS[0];
}
function getNextRank(days, messageCount) {
    const eligible = getEligibleRank(days, messageCount);
    const index = exports.RANKS.findIndex(rank => rank.name === eligible.name);
    return exports.RANKS[index + 1] || null;
}
async function syncMemberRankNow(member, messageCount) {
    const eligibleRank = getEligibleRank(getTenureDays(member), messageCount);
    const rankRoles = exports.RANKS
        .map(rank => member.guild.roles.cache.find(role => role.name === rank.name))
        .filter(role => role !== undefined);
    const currentRankIndexes = exports.RANKS
        .map((rank, index) => ({ index, role: member.guild.roles.cache.find(role => role.name === rank.name) }))
        .filter(item => item.role && member.roles.cache.has(item.role.id))
        .map(item => item.index);
    const currentHighestIndex = currentRankIndexes.length > 0 ? Math.max(...currentRankIndexes) : -1;
    const eligibleIndex = exports.RANKS.findIndex(rank => rank.name === eligibleRank.name);
    const targetIndex = Math.max(currentHighestIndex, eligibleIndex);
    const targetRank = exports.RANKS[targetIndex];
    const targetRole = member.guild.roles.cache.find(role => role.name === targetRank.name);
    if (!targetRole) {
        console.warn(`[ranking] 역할을 찾을 수 없습니다: ${targetRank.name} (${member.guild.name})`);
        return false;
    }
    let changed = false;
    let updatedMember = member;
    if (!updatedMember.roles.cache.has(targetRole.id)) {
        updatedMember = await updatedMember.roles.add(targetRole, '서버 체류기간 및 메시지 활동량 자동 등급');
        changed = true;
    }
    const rolesToRemove = rankRoles.filter(role => role.id !== targetRole.id && updatedMember.roles.cache.has(role.id));
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
async function syncMemberRank(member, messageCount) {
    if (member.user.bot)
        return false;
    const memberKey = `${member.guild.id}:${member.id}`;
    const previousSync = memberRankSyncs.get(memberKey) || Promise.resolve(false);
    const currentSync = previousSync
        .catch(() => false)
        .then(() => syncMemberRankNow(member, messageCount));
    memberRankSyncs.set(memberKey, currentSync);
    try {
        return await currentSync;
    }
    finally {
        if (memberRankSyncs.get(memberKey) === currentSync) {
            memberRankSyncs.delete(memberKey);
        }
    }
}
