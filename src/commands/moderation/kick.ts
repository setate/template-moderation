import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    PermissionFlagsBits,
    GuildMember,
} from "discord.js";
import { db } from "../../services/database";
import { t } from "../../services/localization";
import { successEmbed, errorEmbed } from "../../utils/embed";
import { PRIVATE_RESPONSE_FLAGS, PRIVATE_RESPONSE_NOTICE } from "../../utils/private-response";

export const data = new SlashCommandBuilder()
    .setName("kick")
    .setNameLocalizations({ ko: t("commands.kick.name") })
    .setDescription("Kick a member from the server")
    .setDescriptionLocalizations({ ko: t("commands.kick.description") })
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((option) =>
        option
            .setName("user")
            .setNameLocalizations({ ko: "유저" })
            .setDescription("The user to kick")
            .setDescriptionLocalizations({ ko: t("commands.kick.options.user") })
            .setRequired(true)
    )
    .addStringOption((option) =>
        option
            .setName("reason")
            .setNameLocalizations({ ko: "사유" })
            .setDescription("Reason for kick")
            .setDescriptionLocalizations({ ko: t("commands.kick.options.reason") })
            .setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId || !interaction.guild) {
        return interaction.reply({
            content: PRIVATE_RESPONSE_NOTICE,
            embeds: [errorEmbed(t("errors.guild_only"))],
            flags: PRIVATE_RESPONSE_FLAGS,
        });
    }

    const targetUser = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") || "No reason provided";

    const targetMember = await interaction.guild.members.fetch(targetUser.id);
    const executor = interaction.member as GuildMember;

    // Check if target is the executor
    if (targetUser.id === interaction.user.id) {
        return interaction.reply({
            content: PRIVATE_RESPONSE_NOTICE,
            embeds: [errorEmbed(t("commands.kick.error_self"))],
            flags: PRIVATE_RESPONSE_FLAGS,
        });
    }

    // Check role hierarchy
    if (targetMember.roles.highest.position >= executor.roles.highest.position) {
        return interaction.reply({
            content: PRIVATE_RESPONSE_NOTICE,
            embeds: [errorEmbed(t("commands.kick.error_hierarchy"))],
            flags: PRIVATE_RESPONSE_FLAGS,
        });
    }

    // Check bot's role hierarchy
    const botMember = await interaction.guild.members.fetchMe();
    if (targetMember.roles.highest.position >= botMember.roles.highest.position) {
        return interaction.reply({
            content: PRIVATE_RESPONSE_NOTICE,
            embeds: [errorEmbed(t("commands.kick.error_bot_hierarchy"))],
            flags: PRIVATE_RESPONSE_FLAGS,
        });
    }

    try {
        // Kick the member
        await targetMember.kick(reason);

        // Ensure guild record exists (avoid foreign key violations)
        await db.guild.upsert({
            where: { id: interaction.guildId },
            update: {},
            create: { id: interaction.guildId },
        });

        // Log to database
        await db.moderationLog.create({
            data: {
                guildId: interaction.guildId,
                moderatorId: interaction.user.id,
                targetId: targetUser.id,
                action: "kick",
                reason,
            },
        });

        return interaction.reply({
            content: PRIVATE_RESPONSE_NOTICE,
            embeds: [successEmbed(t("commands.kick.success", { user: targetUser.tag, reason }))],
            flags: PRIVATE_RESPONSE_FLAGS,
        });
    } catch (error) {
        console.error("Kick error:", error);
        return interaction.reply({
            content: PRIVATE_RESPONSE_NOTICE,
            embeds: [errorEmbed(t("errors.unknown_error"))],
            flags: PRIVATE_RESPONSE_FLAGS,
        });
    }
}
