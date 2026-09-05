import { Collection, Guild, GuildMember, Snowflake } from 'discord.js';

interface MemberFetchEntry {
    promise: Promise<Collection<Snowflake, GuildMember>>;
    expiresAt: number;
}

const memberFetches = new Map<string, MemberFetchEntry>();
const MEMBER_FETCH_CACHE_MS = 10_000;
const MEMBER_FETCH_TIMEOUT_MS = 8_000;

function snapshotMembers(guild: Guild): Collection<Snowflake, GuildMember> {
    return new Collection(guild.members.cache);
}

export function fetchGuildMembers(
    guild: Guild,
    timeoutMs = MEMBER_FETCH_TIMEOUT_MS
): Promise<Collection<Snowflake, GuildMember>> {
    // 준비 이벤트에서 모든 멤버를 이미 받은 서버라면 Gateway에 다시 요청하지 않습니다.
    if (guild.members.cache.size >= guild.memberCount) {
        return Promise.resolve(snapshotMembers(guild));
    }

    const cached = memberFetches.get(guild.id);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.promise;
    }

    // Discord의 전체 멤버 요청은 기본적으로 120초까지 기다릴 수 있습니다.
    // 명령어가 계속 '생각 중'으로 남지 않도록 짧게 기다린 뒤 현재 캐시로 복귀합니다.
    const promise = new Promise<Collection<Snowflake, GuildMember>>(resolve => {
        let settled = false;
        let timeout: ReturnType<typeof setTimeout> | undefined;
        const finish = (members: Collection<Snowflake, GuildMember>) => {
            if (settled) return;
            settled = true;
            if (timeout) clearTimeout(timeout);
            resolve(members);
        };

        timeout = setTimeout(() => {
            console.warn(
                `[members] ${guild.name} 전체 멤버 조회가 ${timeoutMs}ms를 넘어 캐시를 사용합니다. `
                + `(${guild.members.cache.size}/${guild.memberCount})`
            );
            finish(snapshotMembers(guild));
        }, timeoutMs);

        try {
            void guild.members.fetch({ time: timeoutMs }).then(
                () => finish(snapshotMembers(guild)),
                error => {
                    if (!settled) {
                        console.warn(`[members] ${guild.name} 전체 멤버 조회 실패, 캐시를 사용합니다:`, error);
                    }
                    finish(snapshotMembers(guild));
                }
            );
        } catch (error) {
            console.warn(`[members] ${guild.name} 전체 멤버 조회 시작 실패, 캐시를 사용합니다:`, error);
            finish(snapshotMembers(guild));
        }
    });
    const entry = {
        promise,
        expiresAt: Number.POSITIVE_INFINITY,
    };
    memberFetches.set(guild.id, entry);

    void promise.then(
        () => {
            entry.expiresAt = Date.now() + MEMBER_FETCH_CACHE_MS;
            const timeout = setTimeout(() => {
                if (memberFetches.get(guild.id) === entry) {
                    memberFetches.delete(guild.id);
                }
            }, MEMBER_FETCH_CACHE_MS);
            timeout.unref();
        }
    );

    return promise;
}
