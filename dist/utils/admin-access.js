"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasServerAdminAccess = hasServerAdminAccess;
const discord_js_1 = require("discord.js");
const ADMIN_ROLE_NAMES = new Set(["probe", "admin"]);
async function hasServerAdminAccess(interaction) {
    if (!interaction.guild)
        return false;
    if (interaction.guild.ownerId === interaction.user.id)
        return true;
    const member = interaction.guild.members.cache.get(interaction.user.id)
        || await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    if (!member)
        return false;
    return member.permissions.has(discord_js_1.PermissionFlagsBits.Administrator)
        || member.roles.cache.some(role => ADMIN_ROLE_NAMES.has(role.name.trim().toLowerCase()));
}
