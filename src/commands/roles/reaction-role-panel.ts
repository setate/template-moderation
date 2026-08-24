import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    PermissionFlagsBits,
    TextChannel,
} from "discord.js";
import { t } from "../../services/localization";
import { createEmbed, successEmbed } from "../../utils/embed";
import { PRIVATE_RESPONSE_NOTICE, withPrivateNotice } from "../../utils/private-response";

export const data = new SlashCommandBuilder()
    .setName("reaction-role-panel")
    .setNameLocalizations({ ko: t("commands.reaction-role-panel.name") })
    .setDescription("Create a reaction role panel")
    .setDescriptionLocalizations({ ko: t("commands.reaction-role-panel.description") })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addStringOption((option) =>
        option
            .setName("title")
            .setNameLocalizations({ ko: "제목" })
            .setDescription("Panel title")
            .setDescriptionLocalizations({ ko: t("commands.reaction-role-panel.options.title") })
            .setRequired(true)
    )
    .addStringOption((option) =>
        option
            .setName("description")
            .setNameLocalizations({ ko: "설명" })
            .setDescription("Panel description")
            .setDescriptionLocalizations({ ko: t("commands.reaction-role-panel.options.description") })
            .setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.channel || !(interaction.channel instanceof TextChannel)) {
        return interaction.reply({
            content: withPrivateNotice(t("errors.guild_only")),
            ephemeral: true,
        });
    }

    const title = interaction.options.getString("title", true);
    const description = interaction.options.getString("description") || "아래 이모지를 클릭하여 역할을 받으세요!";

    const panelEmbed = createEmbed("primary")
        .setTitle(title)
        .setDescription(description);

    const message = await interaction.channel.send({ embeds: [panelEmbed] });

    return interaction.reply({
        content: PRIVATE_RESPONSE_NOTICE,
        embeds: [successEmbed(t("commands.reaction-role-panel.panel_created", { messageId: message.id }))],
        ephemeral: true,
    });
}
