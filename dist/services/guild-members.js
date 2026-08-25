"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchGuildMembers = fetchGuildMembers;
const memberFetches = new Map();
const MEMBER_FETCH_CACHE_MS = 10000;
function fetchGuildMembers(guild) {
    const cached = memberFetches.get(guild.id);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.promise;
    }
    const promise = guild.members.fetch();
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
    }, () => {
        if (memberFetches.get(guild.id) === entry) {
            memberFetches.delete(guild.id);
        }
    });
    return promise;
}
