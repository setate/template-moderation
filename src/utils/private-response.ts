export const PRIVATE_RESPONSE_NOTICE = '🔒 이 메시지는 본인에게만 표시됩니다.';

export function withPrivateNotice(content: string): string {
    return `${content}\n\n${PRIVATE_RESPONSE_NOTICE}`;
}
