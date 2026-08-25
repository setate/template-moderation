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
    .setName("ban")
    .setNameLocalizations({ ko: (0, localization_1.t)("commands.ban.name") })
    .setDescription("Ban a member from the server")
    .setDescriptionLocalizations({ ko: (0, localization_1.t)("commands.ban.description") })
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.BanMembers)
    .addUserOption((option) => option
    .setName("user")
    .setNameLocalizations({ ko: "유저" })
    .setDescription("The user to ban")
    .setDescriptionLocalizations({ ko: (0, localization_1.t)("commands.ban.options.user") })
    .setRequired(true))
    .addStringOption((option) => option
    .setName("reason")
    .setNameLocalizations({ ko: "사유" })
    .setDescription("Reason for ban")
    .setDescriptionLocalizations({ ko: (0, localization_1.t)("commands.ban.options.reason") })
    .setRequired(false))
    .addIntegerOption((option) => option
    .setName("delete_days")
    .setNameLocalizations({ ko: "삭제일수" })
    .setDescription("Delete message history (0-7 days)")
    .setDescriptionLocalizations({ ko: (0, localization_1.t)("commands.ban.options.delete_days") })
    .setRequired(false)
    .setMinValue(0)
    .setMaxValue(7));
async function execute(interaction) {
    if (!interaction.guildId || !interaction.guild) {
        return interaction.reply({
            content: private_response_1.PRIVATE_RESPONSE_NOTICE,
            embeds: [(0, embed_1.errorEmbed)((0, localization_1.t)("errors.guild_only"))],
            flags: private_response_1.PRIVATE_RESPONSE_FLAGS,
        });
    }
    const targetUser = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") || "No reason provided";
    const deleteDays = interaction.options.getInteger("delete_days") || 0;
    const executor = interaction.member;
    if (targetUser.id === interaction.user.id) {
        return interaction.reply({
            content: private_response_1.PRIVATE_RESPONSE_NOTICE,
            embeds: [(0, embed_1.errorEmbed)((0, localization_1.t)("commands.ban.error_self"))],
            flags: private_response_1.PRIVATE_RESPONSE_FLAGS,
        });
    }
    let targetMember = null;
    try {
        targetMember = await interaction.guild.members.fetch(targetUser.id);
    }
    catch (error) {
    }
    if (targetMember) {
        if (targetMember.roles.highest.position >= executor.roles.highest.position) {
            return interaction.reply({
                content: private_response_1.PRIVATE_RESPONSE_NOTICE,
                embeds: [(0, embed_1.errorEmbed)((0, localization_1.t)("commands.ban.error_hierarchy"))],
                flags: private_response_1.PRIVATE_RESPONSE_FLAGS,
            });
        }
        const botMember = await interaction.guild.members.fetchMe();
        if (targetMember.roles.highest.position >= botMember.roles.highest.position) {
            return interaction.reply({
                content: private_response_1.PRIVATE_RESPONSE_NOTICE,
                embeds: [(0, embed_1.errorEmbed)((0, localization_1.t)("commands.ban.error_bot_hierarchy"))],
                flags: private_response_1.PRIVATE_RESPONSE_FLAGS,
            });
        }
    }
    try {
        await interaction.guild.members.ban(targetUser.id, {
            reason,
            deleteMessageSeconds: deleteDays * 24 * 60 * 60,
        });
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
                action: "ban",
                reason,
            },
        });
        return interaction.reply({
            content: private_response_1.PRIVATE_RESPONSE_NOTICE,
            embeds: [(0, embed_1.successEmbed)((0, localization_1.t)("commands.ban.success", { user: targetUser.tag, reason }))],
            flags: private_response_1.PRIVATE_RESPONSE_FLAGS,
        });
    }
    catch (error) {
        console.error("Ban error:", error);
        return interaction.reply({
            content: private_response_1.PRIVATE_RESPONSE_NOTICE,
            embeds: [(0, embed_1.errorEmbed)((0, localization_1.t)("errors.unknown_error"))],
            flags: private_response_1.PRIVATE_RESPONSE_FLAGS,
        });
    }
}
