const assert = require('node:assert/strict');
const test = require('node:test');

const { syncMemberRank } = require('../dist/services/ranking');

class FindableMap extends Map {
    find(predicate) {
        for (const value of this.values()) {
            if (predicate(value)) return value;
        }
        return undefined;
    }
}

const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

function createMember(initialRoleName = '새내기') {
    const roleNames = ['새내기', '학사', '석사', '박사'];
    const guildRoles = new FindableMap(
        roleNames.map((name, index) => [`role-${index}`, { id: `role-${index}`, name }])
    );
    const memberRoles = new FindableMap();
    const initialRole = guildRoles.find(role => role.name === initialRoleName);
    if (initialRole) memberRoles.set(initialRole.id, initialRole);

    let activeRoleChanges = 0;
    let maximumConcurrentRoleChanges = 0;

    async function changeRoles(change) {
        activeRoleChanges += 1;
        maximumConcurrentRoleChanges = Math.max(maximumConcurrentRoleChanges, activeRoleChanges);
        await wait(10);
        change();
        activeRoleChanges -= 1;
    }

    const member = {
        id: 'member-1',
        joinedTimestamp: Date.now() - (31 * 86_400_000),
        user: { bot: false, tag: 'member#0001' },
        guild: {
            id: 'guild-1',
            name: 'test-guild',
            roles: { cache: guildRoles },
        },
        roles: {
            cache: memberRoles,
            add: async role => changeRoles(() => memberRoles.set(role.id, role)),
            remove: async roles => changeRoles(() => {
                for (const role of Array.isArray(roles) ? roles : [roles]) {
                    memberRoles.delete(role.id);
                }
            }),
        },
    };

    return {
        member,
        getRoleNames: () => [...memberRoles.values()].map(role => role.name),
        getMaximumConcurrentRoleChanges: () => maximumConcurrentRoleChanges,
    };
}

test('동시 승급 요청이 겹쳐도 최종 등급 역할 하나를 유지한다', async () => {
    const fixture = createMember();

    await Promise.all([
        syncMemberRank(fixture.member, 50),
        syncMemberRank(fixture.member, 300),
    ]);

    assert.deepEqual(fixture.getRoleNames(), ['석사']);
    assert.equal(fixture.getMaximumConcurrentRoleChanges(), 1);
});

test('등급 역할이 없는 멤버는 다음 동기화에서 현재 등급을 복구한다', async () => {
    const fixture = createMember(null);

    await syncMemberRank(fixture.member, 300);

    assert.deepEqual(fixture.getRoleNames(), ['석사']);
});
