"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasPromotionAdminAccess = hasPromotionAdminAccess;
const admin_access_1 = require("./admin-access");
async function hasPromotionAdminAccess(interaction) {
    return (0, admin_access_1.hasServerAdminAccess)(interaction);
}
