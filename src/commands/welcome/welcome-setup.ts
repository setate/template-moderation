import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    PermissionFlagsBits,
    TextChannel,
    Role,
} from "discord.js";
import { db } from "../../services/database";
import { t } from "../../services/localization";
import { successEmbed, errorEmbed } from "../../utils/embed";
import { PRIVATE_RESPONSE_NOTICE } from "../../utils/private-response";

export const data = new SlashCommandBuilder()
    .setName("welcome-setup")
    .setNameLocalizations({ ko: t("commands.welcome-setup.name") })
    .setDescription("Set up welcome messages and auto-role for new members")
    .setDescriptionLocalizations({ ko: t("commands.welcome-setup.description") })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((option) =>
        option
            .setName("channel")
            .setNameLocalizations({ ko: "채널" })
            .setDescription("Channel to send welcome messages")
            .setDescriptionLocalizations({ ko: t("commands.welcome-setup.options.channel") })
            .setRequired(true)
    )
    .addRoleOption((option) =>
        option
            .setName("role")
            .setNameLocalizations({ ko: "역할" })
            .setDescription("Role to auto-assign to new members")
            .setDescriptionLocalizations({ ko: t("commands.welcome-setup.options.role") })
            .setRequired(false)
    )
    .addStringOption((option) =>
        option
            .setName("message")
            .setNameLocalizations({ ko: "메시지" })
            .setDescription("Welcome message (Variables: {user}, {username}, {server}, {memberCount})")
            .setDescriptionLocalizations({ ko: t("commands.welcome-setup.options.message") })
            .setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
        return interaction.reply({
            content: PRIVATE_RESPONSE_NOTICE,
            embeds: [errorEmbed(t("errors.guild_only"))],
            ephemeral: true,
        });
    }

    const channel = interaction.options.getChannel("channel", true) as TextChannel;
    const role = interaction.options.getRole("role") as Role | null;
    const message = interaction.options.getString("message");

    await db.guild.upsert({
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
        ? t("commands.welcome-setup.success", { channel: channel.toString(), role: role.toString() })
        : t("commands.welcome-setup.success_no_role", { channel: channel.toString() });

    return interaction.reply({
        content: PRIVATE_RESPONSE_NOTICE,
        embeds: [successEmbed(responseMessage)],
        ephemeral: true,
    });
}
