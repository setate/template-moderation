import * as ping from "./ping";

// Welcome commands
import * as welcomeSetup from "./welcome/welcome-setup";
import * as leaveSetup from "./welcome/leave-setup";

// Reaction role commands
import * as reactionRoleAdd from "./roles/reaction-role-add";
import * as reactionRoleRemove from "./roles/reaction-role-remove";
import * as reactionRoleList from "./roles/reaction-role-list";
import * as reactionRolePanel from "./roles/reaction-role-panel";
import * as fieldRoles from "./roles/field-roles";

// Moderation commands
import * as purge from "./moderation/purge";
import * as kick from "./moderation/kick";
import * as ban from "./moderation/ban";

// Activity rank commands
import * as rankStatus from "./ranks/rank-status";
import * as rankCriteria from "./ranks/rank-criteria";
import * as activityScan from "./ranks/activity-scan";
import * as activityLeaderboard from "./ranks/activity-leaderboard";
import * as activitySummary from "./ranks/activity-summary";

// Promotion commands
import * as promotionSetup from "./promotion/promotion-setup";
import * as promotionSubmit from "./promotion/promotion-submit";
import * as promotionCard from "./promotion/promotion-card";
import * as promotionDelete from "./promotion/promotion-delete";

export const commands = {
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
    "promotion-submit": promotionCard,
    "promotion-delete": promotionDelete,
};

