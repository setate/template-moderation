const assert = require("node:assert/strict");
const test = require("node:test");
const { Collection } = require("discord.js");
const { fetchGuildMembers } = require("../dist/services/guild-members");

function member(id) {
    return { id };
}

test("멤버 캐시가 완성되어 있으면 전체 조회를 다시 요청하지 않는다", async () => {
    let fetchCount = 0;
    const guild = {
        id: "complete-cache",
        name: "테스트 서버",
        memberCount: 2,
        members: {
            cache: new Collection([
                ["1", member("1")],
                ["2", member("2")],
            ]),
            fetch: async () => {
                fetchCount += 1;
                return new Collection();
            },
        },
    };

    const members = await fetchGuildMembers(guild, 20);
    assert.equal(fetchCount, 0);
    assert.equal(members.size, 2);
});

test("전체 멤버 조회가 멈춰도 제한시간 뒤 캐시로 복귀한다", async () => {
    const guild = {
        id: "timeout-fallback",
        name: "테스트 서버",
        memberCount: 2,
        members: {
            cache: new Collection([["1", member("1")]]),
            fetch: () => new Promise(() => undefined),
        },
    };

    const startedAt = Date.now();
    const members = await fetchGuildMembers(guild, 20);
    const elapsed = Date.now() - startedAt;

    assert.equal(members.size, 1);
    assert.ok(elapsed < 500, `조회 제한시간을 넘겼습니다: ${elapsed}ms`);
});
