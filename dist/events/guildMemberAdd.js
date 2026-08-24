"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleGuildMemberAdd = handleGuildMemberAdd;
const database_1 = require("../services/database");
const localization_1 = require("../services/localization");
const embed_1 = require("../utils/embed");
async function handleGuildMemberAdd(member) {
    await database_1.db.memberActivity.upsert({
        where: { guildId_userId: { guildId: member.guild.id, userId: member.id } },
        update: {},
        create: { guildId: member.guild.id, userId: member.id, messageCount: 0 },
    });
    const guildConfig = await database_1.db.guild.findUnique({
        where: { id: member.guild.id },
    });
    if (!guildConfig)
        return;
    if (guildConfig.welcomeChannelId) {
        const channel = member.guild.channels.cache.get(guildConfig.welcomeChannelId);
        if (channel) {
            const message = (guildConfig.welcomeMessage || (0, localization_1.t)("events.member_join.default_message"))
                .replace(/{user}/g, member.toString())
                .replace(/{username}/g, member.user.username)
                .replace(/{server}/g, member.guild.name)
                .replace(/{memberCount}/g, member.guild.memberCount.toString());
            const embed = (0, embed_1.createEmbed)("success")
                .setTitle("Welcome! 🎉")
                .setDescription(message)
                .setThumbnail(member.user.displayAvatarURL());
            await channel.send({ embeds: [embed] });
        }
    }
    if (guildConfig.autoRoleId) {
        const role = member.guild.roles.cache.get(guildConfig.autoRoleId);
        if (role) {
            try {
                await member.roles.add(role);
            }
            catch (error) {
                console.error("Failed to assign auto role:", error);
            }
        }
    }
}
