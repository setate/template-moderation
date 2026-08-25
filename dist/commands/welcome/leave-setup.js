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
    .setName("leave-setup")
    .setNameLocalizations({ ko: (0, localization_1.t)("commands.leave-setup.name") })
    .setDescription("Set up leave messages for departing members")
    .setDescriptionLocalizations({ ko: (0, localization_1.t)("commands.leave-setup.description") })
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageGuild)
    .addChannelOption((option) => option
    .setName("channel")
    .setNameLocalizations({ ko: "채널" })
    .setDescription("Channel to send leave messages")
    .setDescriptionLocalizations({ ko: (0, localization_1.t)("commands.leave-setup.options.channel") })
    .setRequired(true))
    .addStringOption((option) => option
    .setName("message")
    .setNameLocalizations({ ko: "메시지" })
    .setDescription("Leave message (Variables: {user}, {username}, {server})")
    .setDescriptionLocalizations({ ko: (0, localization_1.t)("commands.leave-setup.options.message") })
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
    const message = interaction.options.getString("message");
    await database_1.db.guild.upsert({
        where: { id: interaction.guildId },
        update: {
            leaveChannelId: channel.id,
            ...(message && { leaveMessage: message }),
        },
        create: {
            id: interaction.guildId,
            leaveChannelId: channel.id,
            ...(message && { leaveMessage: message }),
        },
    });
    return interaction.reply({
        content: private_response_1.PRIVATE_RESPONSE_NOTICE,
        embeds: [(0, embed_1.successEmbed)((0, localization_1.t)("commands.leave-setup.success"))],
        flags: private_response_1.PRIVATE_RESPONSE_FLAGS,
    });
}
