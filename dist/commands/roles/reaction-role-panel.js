"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const localization_1 = require("../../services/localization");
const embed_1 = require("../../utils/embed");
const private_response_1 = require("../../utils/private-response");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName("reaction-role-panel")
    .setNameLocalizations({ ko: (0, localization_1.t)("commands.reaction-role-panel.name") })
    .setDescription("Create a reaction role panel")
    .setDescriptionLocalizations({ ko: (0, localization_1.t)("commands.reaction-role-panel.description") })
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageRoles)
    .addStringOption((option) => option
    .setName("title")
    .setNameLocalizations({ ko: "제목" })
    .setDescription("Panel title")
    .setDescriptionLocalizations({ ko: (0, localization_1.t)("commands.reaction-role-panel.options.title") })
    .setRequired(true))
    .addStringOption((option) => option
    .setName("description")
    .setNameLocalizations({ ko: "설명" })
    .setDescription("Panel description")
    .setDescriptionLocalizations({ ko: (0, localization_1.t)("commands.reaction-role-panel.options.description") })
    .setRequired(false));
async function execute(interaction) {
    if (!interaction.channel || !(interaction.channel instanceof discord_js_1.TextChannel)) {
        return interaction.reply({
            content: (0, private_response_1.withPrivateNotice)((0, localization_1.t)("errors.guild_only")),
            flags: private_response_1.PRIVATE_RESPONSE_FLAGS,
        });
    }
    const title = interaction.options.getString("title", true);
    const description = interaction.options.getString("description") || "아래 이모지를 클릭하여 역할을 받으세요!";
    const panelEmbed = (0, embed_1.createEmbed)("primary")
        .setTitle(title)
        .setDescription(description);
    const message = await interaction.channel.send({ embeds: [panelEmbed] });
    return interaction.reply({
        content: private_response_1.PRIVATE_RESPONSE_NOTICE,
        embeds: [(0, embed_1.successEmbed)((0, localization_1.t)("commands.reaction-role-panel.panel_created", { messageId: message.id }))],
        flags: private_response_1.PRIVATE_RESPONSE_FLAGS,
    });
}
