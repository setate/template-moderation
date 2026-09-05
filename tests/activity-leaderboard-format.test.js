const assert = require("node:assert/strict");
const test = require("node:test");
const { formatActivityRankLine } = require("../dist/commands/ranks/activity-leaderboard-format");

test("전체 순위와 TOP 20이 공유하는 사용자 한 줄 형식을 유지한다", () => {
    const member = {
        displayName: "테*스트",
        joinedTimestamp: Date.now() - (10 * 86_400_000) - 60_000,
        roles: {
            color: { toString: () => "<@&123>" },
        },
    };

    const line = formatActivityRankLine(member, 1234, 3);

    assert.equal(line, "**4.** **테\\*스트** <@&123> — **1,234개** · 체류 **10일**");
    assert.equal(line.split("\n").length, 1);
});
