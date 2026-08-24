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
    .setName("reaction-role-add")
    .setNameLocalizations({ ko: (0, localization_1.t)("commands.reaction-role-add.name") })
    .setDescription("Add a reaction role to a message")
    .setDescriptionLocalizations({ ko: (0, localization_1.t)("commands.reaction-role-add.description") })
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageRoles)
    .addStringOption((option) => option
    .setName("message_id")
    .setNameLocalizations({ ko: "메시지id" })
    .setDescription("The message ID to add reaction role")
    .setDescriptionLocalizations({ ko: (0, localization_1.t)("commands.reaction-role-add.options.message_id") })
    .setRequired(true))
    .addStringOption((option) => option
    .setName("emoji")
    .setNameLocalizations({ ko: "이모지" })
    .setDescription("The emoji to use")
    .setDescriptionLocalizations({ ko: (0, localization_1.t)("commands.reaction-role-add.options.emoji") })
    .setRequired(true))
    .addRoleOption((option) => option
    .setName("role")
    .setNameLocalizations({ ko: "역할" })
    .setDescription("The role to assign")
    .setDescriptionLocalizations({ ko: (0, localization_1.t)("commands.reaction-role-add.options.role") })
    .setRequired(true));
async function execute(interaction) {
    if (!interaction.guildId || !interaction.channel) {
        return interaction.reply({
            content: private_response_1.PRIVATE_RESPONSE_NOTICE,
            embeds: [(0, embed_1.errorEmbed)((0, localization_1.t)("errors.guild_only"))],
            ephemeral: true,
        });
    }
    const messageId = interaction.options.getString("message_id", true);
    const emoji = interaction.options.getString("emoji", true);
    const role = interaction.options.getRole("role", true);
    let message;
    try {
        message = await interaction.channel.messages.fetch(messageId);
    }
    catch (error) {
        return interaction.reply({
            content: private_response_1.PRIVATE_RESPONSE_NOTICE,
            embeds: [(0, embed_1.errorEmbed)((0, localization_1.t)("commands.reaction-role-add.error_message_not_found"))],
            ephemeral: true,
        });
    }
    const existing = await database_1.db.reactionRole.findUnique({
        where: {
            messageId_emoji: {
                messageId,
                emoji,
            },
        },
    });
    if (existing) {
        return interaction.reply({
            content: private_response_1.PRIVATE_RESPONSE_NOTICE,
            embeds: [(0, embed_1.errorEmbed)((0, localization_1.t)("commands.reaction-role-add.error_already_exists"))],
            ephemeral: true,
        });
    }
    await database_1.db.reactionRole.create({
        data: {
            guildId: interaction.guildId,
            messageId,
            channelId: interaction.channel.id,
            emoji,
            roleId: role.id,
        },
    });
    try {
        await message.react(emoji);
    }
    catch (error) {
        console.error("Failed to react:", error);
    }
    return interaction.reply({
        content: private_response_1.PRIVATE_RESPONSE_NOTICE,
        embeds: [(0, embed_1.successEmbed)((0, localization_1.t)("commands.reaction-role-add.success", { emoji, role: role.toString() }))],
        ephemeral: true,
    });
}
