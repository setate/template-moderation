"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const database_1 = require("../../services/database");
const localization_1 = require("../../services/localization");
const embed_1 = require("../../utils/embed");
const private_response_1 = require("../../utils/private-response");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName("kick")
    .setNameLocalizations({ ko: (0, localization_1.t)("commands.kick.name") })
    .setDescription("Kick a member from the server")
    .setDescriptionLocalizations({ ko: (0, localization_1.t)("commands.kick.description") })
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.KickMembers)
    .addUserOption((option) => option
    .setName("user")
    .setNameLocalizations({ ko: "유저" })
    .setDescription("The user to kick")
    .setDescriptionLocalizations({ ko: (0, localization_1.t)("commands.kick.options.user") })
    .setRequired(true))
    .addStringOption((option) => option
    .setName("reason")
    .setNameLocalizations({ ko: "사유" })
    .setDescription("Reason for kick")
    .setDescriptionLocalizations({ ko: (0, localization_1.t)("commands.kick.options.reason") })
    .setRequired(false));
async function execute(interaction) {
    if (!interaction.guildId || !interaction.guild) {
        return interaction.reply({
            content: private_response_1.PRIVATE_RESPONSE_NOTICE,
            embeds: [(0, embed_1.errorEmbed)((0, localization_1.t)("errors.guild_only"))],
            ephemeral: true,
        });
    }
    const targetUser = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") || "No reason provided";
    const targetMember = await interaction.guild.members.fetch(targetUser.id);
    const executor = interaction.member;
    if (targetUser.id === interaction.user.id) {
        return interaction.reply({
            content: private_response_1.PRIVATE_RESPONSE_NOTICE,
            embeds: [(0, embed_1.errorEmbed)((0, localization_1.t)("commands.kick.error_self"))],
            ephemeral: true,
        });
    }
    if (targetMember.roles.highest.position >= executor.roles.highest.position) {
        return interaction.reply({
            content: private_response_1.PRIVATE_RESPONSE_NOTICE,
            embeds: [(0, embed_1.errorEmbed)((0, localization_1.t)("commands.kick.error_hierarchy"))],
            ephemeral: true,
        });
    }
    const botMember = await interaction.guild.members.fetchMe();
    if (targetMember.roles.highest.position >= botMember.roles.highest.position) {
        return interaction.reply({
            content: private_response_1.PRIVATE_RESPONSE_NOTICE,
            embeds: [(0, embed_1.errorEmbed)((0, localization_1.t)("commands.kick.error_bot_hierarchy"))],
            ephemeral: true,
        });
    }
    try {
        await targetMember.kick(reason);
        await database_1.db.guild.upsert({
            where: { id: interaction.guildId },
            update: {},
            create: { id: interaction.guildId },
        });
        await database_1.db.moderationLog.create({
            data: {
                guildId: interaction.guildId,
                moderatorId: interaction.user.id,
                targetId: targetUser.id,
                action: "kick",
                reason,
            },
        });
        return interaction.reply({
            content: private_response_1.PRIVATE_RESPONSE_NOTICE,
            embeds: [(0, embed_1.successEmbed)((0, localization_1.t)("commands.kick.success", { user: targetUser.tag, reason }))],
            ephemeral: true,
        });
    }
    catch (error) {
        console.error("Kick error:", error);
        return interaction.reply({
            content: private_response_1.PRIVATE_RESPONSE_NOTICE,
            embeds: [(0, embed_1.errorEmbed)((0, localization_1.t)("errors.unknown_error"))],
            ephemeral: true,
        });
    }
}
