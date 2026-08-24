import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    PermissionFlagsBits,
} from "discord.js";
import { db } from "../../services/database";
import { t } from "../../services/localization";
import { createEmbed } from "../../utils/embed";
import { PRIVATE_RESPONSE_NOTICE, withPrivateNotice } from "../../utils/private-response";

export const data = new SlashCommandBuilder()
    .setName("reaction-role-list")
    .setNameLocalizations({ ko: t("commands.reaction-role-list.name") })
    .setDescription("List all reaction roles in this server")
    .setDescriptionLocalizations({ ko: t("commands.reaction-role-list.description") })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
        return interaction.reply({
            content: withPrivateNotice(t("errors.guild_only")),
            ephemeral: true,
        });
    }

    const reactionRoles = await db.reactionRole.findMany({
        where: { guildId: interaction.guildId },
    });

    const embed = createEmbed("info").setTitle(t("commands.reaction-role-list.title"));

    if (reactionRoles.length === 0) {
        embed.setDescription(t("commands.reaction-role-list.no_roles"));
    } else {
        const description = reactionRoles
            .map((rr) => {
                const role = interaction.guild?.roles.cache.get(rr.roleId);
                return `${rr.emoji} → ${role || rr.roleId}\n📝 Message: [${rr.messageId}](https://discord.com/channels/${rr.guildId}/${rr.channelId}/${rr.messageId})`;
            })
            .join("\n\n");

        embed.setDescription(description);
        embed.setFooter({ text: t("commands.reaction-role-list.footer", { count: reactionRoles.length.toString() }) });
    }

    return interaction.reply({ content: PRIVATE_RESPONSE_NOTICE, embeds: [embed], ephemeral: true });
}
