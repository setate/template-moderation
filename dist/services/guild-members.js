"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchGuildMembers = fetchGuildMembers;
const discord_js_1 = require("discord.js");
const memberFetches = new Map();
const MEMBER_FETCH_CACHE_MS = 10000;
const MEMBER_FETCH_TIMEOUT_MS = 8000;
function snapshotMembers(guild) {
    return new discord_js_1.Collection(guild.members.cache);
}
function fetchGuildMembers(guild, timeoutMs = MEMBER_FETCH_TIMEOUT_MS) {
    if (guild.members.cache.size >= guild.memberCount) {
        return Promise.resolve(snapshotMembers(guild));
    }
    const cached = memberFetches.get(guild.id);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.promise;
    }
    const promise = new Promise(resolve => {
        let settled = false;
        let timeout;
        const finish = (members) => {
            if (settled)
                return;
            settled = true;
            if (timeout)
                clearTimeout(timeout);
            resolve(members);
        };
        timeout = setTimeout(() => {
            console.warn(`[members] ${guild.name} 전체 멤버 조회가 ${timeoutMs}ms를 넘어 캐시를 사용합니다. `
                + `(${guild.members.cache.size}/${guild.memberCount})`);
            finish(snapshotMembers(guild));
        }, timeoutMs);
        try {
            void guild.members.fetch({ time: timeoutMs }).then(() => finish(snapshotMembers(guild)), error => {
                if (!settled) {
                    console.warn(`[members] ${guild.name} 전체 멤버 조회 실패, 캐시를 사용합니다:`, error);
                }
                finish(snapshotMembers(guild));
            });
        }
        catch (error) {
            console.warn(`[members] ${guild.name} 전체 멤버 조회 시작 실패, 캐시를 사용합니다:`, error);
            finish(snapshotMembers(guild));
        }
    });
    const entry = {
        promise,
        expiresAt: Number.POSITIVE_INFINITY,
    };
    memberFetches.set(guild.id, entry);
    void promise.then(() => {
        entry.expiresAt = Date.now() + MEMBER_FETCH_CACHE_MS;
        const timeout = setTimeout(() => {
            if (memberFetches.get(guild.id) === entry) {
                memberFetches.delete(guild.id);
            }
        }, MEMBER_FETCH_CACHE_MS);
        timeout.unref();
    });
    return promise;
}
