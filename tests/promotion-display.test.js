const assert = require('node:assert/strict');
const test = require('node:test');

const {
    buildPromotionRegistrationNotice,
    replacePromotionUserMentions,
} = require('../dist/utils/promotion-display');

test('홍보 등록 알림은 사용자 멘션 대신 서버 표시명을 사용한다', () => {
    const notice = buildPromotionRegistrationNotice('probe', '작성자', false);

    assert.equal(notice, '📢 관리자 **probe**님이 **작성자**님의 메시지를 홍보로 등록했습니다.');
    assert.doesNotMatch(notice, /<@/);
});

test('기존 홍보 알림의 일반 멘션과 별명 멘션을 표시명으로 교체한다', () => {
    const repaired = replacePromotionUserMentions(
        '📢 관리자 <@123>님이 <@!456>님의 메시지를 홍보로 등록했습니다.',
        new Map([['123', 'probe'], ['456', '작성자']])
    );

    assert.equal(repaired, '📢 관리자 **probe**님이 **작성자**님의 메시지를 홍보로 등록했습니다.');
});
