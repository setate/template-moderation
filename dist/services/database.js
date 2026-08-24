"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.memberActivity = exports.moderationLog = exports.reactionRole = exports.guild = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const DATA_DIR = path_1.default.join(process.cwd(), 'data');
const GUILDS_FILE = path_1.default.join(DATA_DIR, 'guilds.json');
const REACTION_ROLES_FILE = path_1.default.join(DATA_DIR, 'reaction-roles.json');
const MODERATION_LOGS_FILE = path_1.default.join(DATA_DIR, 'moderation-logs.json');
const MEMBER_ACTIVITY_FILE = path_1.default.join(DATA_DIR, 'member-activity.json');
let guilds = [];
let reactionRoles = [];
let moderationLogs = [];
let memberActivities = [];
function ensureDataDirectory() {
    if (!fs_1.default.existsSync(DATA_DIR)) {
        fs_1.default.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs_1.default.existsSync(GUILDS_FILE)) {
        fs_1.default.writeFileSync(GUILDS_FILE, JSON.stringify([], null, 2));
    }
    if (!fs_1.default.existsSync(REACTION_ROLES_FILE)) {
        fs_1.default.writeFileSync(REACTION_ROLES_FILE, JSON.stringify([], null, 2));
    }
    if (!fs_1.default.existsSync(MODERATION_LOGS_FILE)) {
        fs_1.default.writeFileSync(MODERATION_LOGS_FILE, JSON.stringify([], null, 2));
    }
    if (!fs_1.default.existsSync(MEMBER_ACTIVITY_FILE)) {
        fs_1.default.writeFileSync(MEMBER_ACTIVITY_FILE, JSON.stringify([], null, 2));
    }
}
function loadData() {
    try {
        guilds = JSON.parse(fs_1.default.readFileSync(GUILDS_FILE, 'utf-8'));
        reactionRoles = JSON.parse(fs_1.default.readFileSync(REACTION_ROLES_FILE, 'utf-8'));
        moderationLogs = JSON.parse(fs_1.default.readFileSync(MODERATION_LOGS_FILE, 'utf-8'));
        memberActivities = JSON.parse(fs_1.default.readFileSync(MEMBER_ACTIVITY_FILE, 'utf-8'));
    }
    catch (error) {
        console.error('Error loading data:', error);
    }
}
function saveGuilds() {
    fs_1.default.writeFileSync(GUILDS_FILE, JSON.stringify(guilds, null, 2));
}
function saveReactionRoles() {
    fs_1.default.writeFileSync(REACTION_ROLES_FILE, JSON.stringify(reactionRoles, null, 2));
}
function saveModerationLogs() {
    fs_1.default.writeFileSync(MODERATION_LOGS_FILE, JSON.stringify(moderationLogs, null, 2));
}
function saveMemberActivities() {
    fs_1.default.writeFileSync(MEMBER_ACTIVITY_FILE, JSON.stringify(memberActivities, null, 2));
}
exports.guild = {
    findUnique: async (where) => {
        return guilds.find(g => g.id === where.where.id) || null;
    },
    upsert: async (data) => {
        const existingIndex = guilds.findIndex(g => g.id === data.where.id);
        const now = new Date().toISOString();
        if (existingIndex >= 0) {
            guilds[existingIndex] = {
                ...guilds[existingIndex],
                ...data.update,
                updatedAt: now
            };
        }
        else {
            guilds.push({
                id: data.where.id,
                welcomeMessage: "Welcome {user}! You are the {memberCount}th member of {server}!",
                leaveMessage: "{user} has left the server.",
                createdAt: now,
                updatedAt: now,
                ...data.create
            });
        }
        saveGuilds();
        return guilds.find(g => g.id === data.where.id);
    }
};
exports.reactionRole = {
    findUnique: async (where) => {
        const { messageId, emoji } = where.where.messageId_emoji;
        return reactionRoles.find(rr => rr.messageId === messageId && rr.emoji === emoji) || null;
    },
    findMany: async (where) => {
        if (!where?.where)
            return reactionRoles;
        let filtered = reactionRoles;
        if (where.where.guildId) {
            filtered = filtered.filter(rr => rr.guildId === where.where.guildId);
        }
        if (where.where.messageId) {
            filtered = filtered.filter(rr => rr.messageId === where.where.messageId);
        }
        return filtered;
    },
    create: async (data) => {
        const newId = reactionRoles.length > 0 ? Math.max(...reactionRoles.map(rr => rr.id)) + 1 : 1;
        const newReactionRole = {
            ...data.data,
            id: newId,
            createdAt: new Date().toISOString()
        };
        reactionRoles.push(newReactionRole);
        saveReactionRoles();
        return newReactionRole;
    },
    delete: async (where) => {
        const index = reactionRoles.findIndex(rr => rr.id === where.where.id);
        if (index >= 0) {
            const deleted = reactionRoles[index];
            reactionRoles.splice(index, 1);
            saveReactionRoles();
            return deleted;
        }
        return null;
    },
    deleteMany: async (where) => {
        const initialLength = reactionRoles.length;
        reactionRoles = reactionRoles.filter(rr => rr.messageId !== where.where.messageId);
        const deletedCount = initialLength - reactionRoles.length;
        if (deletedCount > 0) {
            saveReactionRoles();
        }
        return { count: deletedCount };
    }
};
exports.moderationLog = {
    create: async (data) => {
        const newId = moderationLogs.length > 0 ? Math.max(...moderationLogs.map(ml => ml.id)) + 1 : 1;
        const newLog = {
            ...data.data,
            id: newId,
            createdAt: new Date().toISOString()
        };
        moderationLogs.push(newLog);
        saveModerationLogs();
        return newLog;
    }
};
exports.memberActivity = {
    findUnique: async (where) => {
        const { guildId, userId } = where.where.guildId_userId;
        return memberActivities.find(activity => activity.guildId === guildId && activity.userId === userId) || null;
    },
    findMany: async (where) => {
        return memberActivities.filter(activity => activity.guildId === where.where.guildId);
    },
    upsert: async (data) => {
        const { guildId, userId } = data.where.guildId_userId;
        const existingIndex = memberActivities.findIndex(activity => activity.guildId === guildId && activity.userId === userId);
        const now = new Date().toISOString();
        if (existingIndex >= 0) {
            memberActivities[existingIndex] = {
                ...memberActivities[existingIndex],
                ...data.update,
                updatedAt: now,
            };
        }
        else {
            memberActivities.push({
                guildId,
                userId,
                messageCount: 0,
                createdAt: now,
                updatedAt: now,
                ...data.create,
            });
        }
        saveMemberActivities();
        return memberActivities.find(activity => activity.guildId === guildId && activity.userId === userId);
    },
    increment: async (data) => {
        const { guildId, userId } = data;
        const existingIndex = memberActivities.findIndex(activity => activity.guildId === guildId && activity.userId === userId);
        const now = (data.occurredAt || new Date()).toISOString();
        if (existingIndex >= 0) {
            memberActivities[existingIndex].messageCount += 1;
            memberActivities[existingIndex].lastMessageAt = now;
            memberActivities[existingIndex].updatedAt = now;
        }
        else {
            memberActivities.push({
                guildId,
                userId,
                messageCount: 1,
                lastMessageAt: now,
                createdAt: now,
                updatedAt: now,
            });
        }
        saveMemberActivities();
        return memberActivities.find(activity => activity.guildId === guildId && activity.userId === userId);
    },
    replaceGuildCounts: async (guildId, counts) => {
        const now = new Date().toISOString();
        const existingByUser = new Map(memberActivities
            .filter(activity => activity.guildId === guildId)
            .map(activity => [activity.userId, activity]));
        memberActivities = memberActivities.filter(activity => activity.guildId !== guildId);
        for (const [userId, messageCount] of counts) {
            const existing = existingByUser.get(userId);
            memberActivities.push({
                guildId,
                userId,
                messageCount,
                lastMessageAt: existing?.lastMessageAt,
                createdAt: existing?.createdAt || now,
                updatedAt: now,
            });
        }
        saveMemberActivities();
        return memberActivities.filter(activity => activity.guildId === guildId);
    },
};
ensureDataDirectory();
loadData();
process.on('beforeExit', () => {
    console.log('Saving data before exit...');
});
exports.db = {
    guild: exports.guild,
    reactionRole: exports.reactionRole,
    moderationLog: exports.moderationLog,
    memberActivity: exports.memberActivity,
};
