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
    .setName("welcome-setup")
    .setNameLocalizations({ ko: (0, localization_1.t)("commands.welcome-setup.name") })
    .setDescription("Set up welcome messages and auto-role for new members")
    .setDescriptionLocalizations({ ko: (0, localization_1.t)("commands.welcome-setup.description") })
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageGuild)
    .addChannelOption((option) => option
    .setName("channel")
    .setNameLocalizations({ ko: "채널" })
    .setDescription("Channel to send welcome messages")
    .setDescriptionLocalizations({ ko: (0, localization_1.t)("commands.welcome-setup.options.channel") })
    .setRequired(true))
    .addRoleOption((option) => option
    .setName("role")
    .setNameLocalizations({ ko: "역할" })
    .setDescription("Role to auto-assign to new members")
    .setDescriptionLocalizations({ ko: (0, localization_1.t)("commands.welcome-setup.options.role") })
    .setRequired(false))
    .addStringOption((option) => option
    .setName("message")
    .setNameLocalizations({ ko: "메시지" })
    .setDescription("Welcome message (Variables: {user}, {username}, {server}, {memberCount})")
    .setDescriptionLocalizations({ ko: (0, localization_1.t)("commands.welcome-setup.options.message") })
    .setRequired(false));
async function execute(interaction) {
    if (!interaction.guildId) {
        return interaction.reply({
            content: private_response_1.PRIVATE_RESPONSE_NOTICE,
            embeds: [(0, embed_1.errorEmbed)((0, localization_1.t)("errors.guild_only"))],
            flags: private_response_1.PRIVATE_RESPONSE_FLAGS,
        });
    }
    const channel = interaction.options.getChannel("channel", true);
    const role = interaction.options.getRole("role");
    const message = interaction.options.getString("message");
    await database_1.db.guild.upsert({
        where: { id: interaction.guildId },
        update: {
            welcomeChannelId: channel.id,
            autoRoleId: role?.id,
            ...(message && { welcomeMessage: message }),
        },
        create: {
            id: interaction.guildId,
            welcomeChannelId: channel.id,
            autoRoleId: role?.id,
            ...(message && { welcomeMessage: message }),
        },
    });
    const responseMessage = role
        ? (0, localization_1.t)("commands.welcome-setup.success", { channel: channel.toString(), role: role.toString() })
        : (0, localization_1.t)("commands.welcome-setup.success_no_role", { channel: channel.toString() });
    return interaction.reply({
        content: private_response_1.PRIVATE_RESPONSE_NOTICE,
        embeds: [(0, embed_1.successEmbed)(responseMessage)],
        flags: private_response_1.PRIVATE_RESPONSE_FLAGS,
    });
}
