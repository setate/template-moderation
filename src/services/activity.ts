import { db, MemberActivity } from './database';

const activeScanDeltas = new Map<string, Map<string, number>>();

export function isHistoricalScanActive(guildId: string): boolean {
    return activeScanDeltas.has(guildId);
}

export function beginHistoricalScan(guildId: string): void {
    if (activeScanDeltas.has(guildId)) {
        throw new Error('A historical scan is already running for this guild.');
    }
    activeScanDeltas.set(guildId, new Map());
}

export function cancelHistoricalScan(guildId: string): void {
    activeScanDeltas.delete(guildId);
}

export async function recordMessage(
    guildId: string,
    userId: string,
    occurredAt = new Date()
): Promise<MemberActivity> {
    const scanDelta = activeScanDeltas.get(guildId);
    if (scanDelta) {
        scanDelta.set(userId, (scanDelta.get(userId) || 0) + 1);
    }

    return db.memberActivity.increment({ guildId, userId, occurredAt });
}

export async function finishHistoricalScan(
    guildId: string,
    historicalCounts: Map<string, number>
): Promise<Map<string, number>> {
    const scanDelta = activeScanDeltas.get(guildId) || new Map<string, number>();
    const finalCounts = new Map(historicalCounts);

    for (const [userId, count] of scanDelta) {
        finalCounts.set(userId, (finalCounts.get(userId) || 0) + count);
    }

    await db.memberActivity.replaceGuildCounts(guildId, finalCounts);
    activeScanDeltas.delete(guildId);
    return finalCounts;
}
