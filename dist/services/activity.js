"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isHistoricalScanActive = isHistoricalScanActive;
exports.beginHistoricalScan = beginHistoricalScan;
exports.cancelHistoricalScan = cancelHistoricalScan;
exports.recordMessage = recordMessage;
exports.finishHistoricalScan = finishHistoricalScan;
const database_1 = require("./database");
const activeScanDeltas = new Map();
function isHistoricalScanActive(guildId) {
    return activeScanDeltas.has(guildId);
}
function beginHistoricalScan(guildId) {
    if (activeScanDeltas.has(guildId)) {
        throw new Error('A historical scan is already running for this guild.');
    }
    activeScanDeltas.set(guildId, new Map());
}
function cancelHistoricalScan(guildId) {
    activeScanDeltas.delete(guildId);
}
async function recordMessage(guildId, userId, occurredAt = new Date()) {
    const scanDelta = activeScanDeltas.get(guildId);
    if (scanDelta) {
        scanDelta.set(userId, (scanDelta.get(userId) || 0) + 1);
    }
    return database_1.db.memberActivity.increment({ guildId, userId, occurredAt });
}
async function finishHistoricalScan(guildId, historicalCounts) {
    const scanDelta = activeScanDeltas.get(guildId) || new Map();
    const finalCounts = new Map(historicalCounts);
    for (const [userId, count] of scanDelta) {
        finalCounts.set(userId, (finalCounts.get(userId) || 0) + count);
    }
    await database_1.db.memberActivity.replaceGuildCounts(guildId, finalCounts);
    activeScanDeltas.delete(guildId);
    return finalCounts;
}
