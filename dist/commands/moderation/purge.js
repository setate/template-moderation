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
    .setName("purge")
    .setNameLocalizations({ ko: (0, localization_1.t)("commands.purge.name") })
    .setDescription("Delete multiple messages at once")
    .setDescriptionLocalizations({ ko: (0, localization_1.t)("commands.purge.description") })
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageMessages)
    .addIntegerOption((option) => option
    .setName("amount")
    .setNameLocalizations({ ko: "개수" })
    .setDescription("Number of messages to delete (1-100)")
    .setDescriptionLocalizations({ ko: (0, localization_1.t)("commands.purge.options.amount") })
    .setRequired(true)
    .setMinValue(1)
    .setMaxValue(100));
async function execute(interaction) {
    if (!interaction.guildId || !interaction.channel || !(interaction.channel instanceof discord_js_1.TextChannel)) {
        return interaction.reply({
            content: private_response_1.PRIVATE_RESPONSE_NOTICE,
            embeds: [(0, embed_1.errorEmbed)((0, localization_1.t)("errors.guild_only"))],
            flags: private_response_1.PRIVATE_RESPONSE_FLAGS,
        });
    }
    const amount = interaction.options.getInteger("amount", true);
    if (amount < 1 || amount > 100) {
        return interaction.reply({
            content: private_response_1.PRIVATE_RESPONSE_NOTICE,
            embeds: [(0, embed_1.errorEmbed)((0, localization_1.t)("commands.purge.error_amount"))],
            flags: private_response_1.PRIVATE_RESPONSE_FLAGS,
        });
    }
    try {
        const deleted = await interaction.channel.bulkDelete(amount, true);
        await database_1.db.guild.upsert({
            where: { id: interaction.guildId },
            update: {},
            create: { id: interaction.guildId },
        });
        await database_1.db.moderationLog.create({
            data: {
                guildId: interaction.guildId,
                moderatorId: interaction.user.id,
                targetId: interaction.channel.id,
                action: "purge",
                amount: deleted.size,
            },
        });
        return interaction.reply({
            content: private_response_1.PRIVATE_RESPONSE_NOTICE,
            embeds: [(0, embed_1.successEmbed)((0, localization_1.t)("commands.purge.success", { count: deleted.size.toString() }))],
            flags: private_response_1.PRIVATE_RESPONSE_FLAGS,
        });
    }
    catch (error) {
        console.error("Purge error:", error);
        return interaction.reply({
            content: private_response_1.PRIVATE_RESPONSE_NOTICE,
            embeds: [(0, embed_1.errorEmbed)((0, localization_1.t)("commands.purge.error_old_messages"))],
            flags: private_response_1.PRIVATE_RESPONSE_FLAGS,
        });
    }
}
