"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.commands = void 0;
const ping = __importStar(require("./ping"));
const welcomeSetup = __importStar(require("./welcome/welcome-setup"));
const leaveSetup = __importStar(require("./welcome/leave-setup"));
const reactionRoleAdd = __importStar(require("./roles/reaction-role-add"));
const reactionRoleRemove = __importStar(require("./roles/reaction-role-remove"));
const reactionRoleList = __importStar(require("./roles/reaction-role-list"));
const reactionRolePanel = __importStar(require("./roles/reaction-role-panel"));
const fieldRoles = __importStar(require("./roles/field-roles"));
const purge = __importStar(require("./moderation/purge"));
const kick = __importStar(require("./moderation/kick"));
const ban = __importStar(require("./moderation/ban"));
const rankStatus = __importStar(require("./ranks/rank-status"));
const rankCriteria = __importStar(require("./ranks/rank-criteria"));
const activityScan = __importStar(require("./ranks/activity-scan"));
const activityLeaderboard = __importStar(require("./ranks/activity-leaderboard"));
const activitySummary = __importStar(require("./ranks/activity-summary"));
const promotionSetup = __importStar(require("./promotion/promotion-setup"));
const promotionSubmit = __importStar(require("./promotion/promotion-submit"));
const promotionDelete = __importStar(require("./promotion/promotion-delete"));
exports.commands = {
    ping,
    "welcome-setup": welcomeSetup,
    "leave-setup": leaveSetup,
    "reaction-role-add": reactionRoleAdd,
    "reaction-role-remove": reactionRoleRemove,
    "reaction-role-list": reactionRoleList,
    "reaction-role-panel": reactionRolePanel,
    "role-setup": fieldRoles,
    purge,
    kick,
    ban,
    "rank-status": rankStatus,
    "rank-criteria": rankCriteria,
    "activity-scan": activityScan,
    "activity-leaderboard": activityLeaderboard,
    "activity-summary": activitySummary,
    "promotion-setup": promotionSetup,
    "Promote Message": promotionSubmit,
    "promotion-delete": promotionDelete,
};
