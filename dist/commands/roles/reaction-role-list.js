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
    .setName("reaction-role-list")
    .setNameLocalizations({ ko: (0, localization_1.t)("commands.reaction-role-list.name") })
    .setDescription("List all reaction roles in this server")
    .setDescriptionLocalizations({ ko: (0, localization_1.t)("commands.reaction-role-list.description") })
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageRoles);
async function execute(interaction) {
    if (!interaction.guildId) {
        return interaction.reply({
            content: (0, private_response_1.withPrivateNotice)((0, localization_1.t)("errors.guild_only")),
            ephemeral: true,
        });
    }
    const reactionRoles = await database_1.db.reactionRole.findMany({
        where: { guildId: interaction.guildId },
    });
    const embed = (0, embed_1.createEmbed)("info").setTitle((0, localization_1.t)("commands.reaction-role-list.title"));
    if (reactionRoles.length === 0) {
        embed.setDescription((0, localization_1.t)("commands.reaction-role-list.no_roles"));
    }
    else {
        const description = reactionRoles
            .map((rr) => {
            const role = interaction.guild?.roles.cache.get(rr.roleId);
            return `${rr.emoji} → ${role || rr.roleId}\n📝 Message: [${rr.messageId}](https://discord.com/channels/${rr.guildId}/${rr.channelId}/${rr.messageId})`;
        })
            .join("\n\n");
        embed.setDescription(description);
        embed.setFooter({ text: (0, localization_1.t)("commands.reaction-role-list.footer", { count: reactionRoles.length.toString() }) });
    }
    return interaction.reply({ content: private_response_1.PRIVATE_RESPONSE_NOTICE, embeds: [embed], ephemeral: true });
}
