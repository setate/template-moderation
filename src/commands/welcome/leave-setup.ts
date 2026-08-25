import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    PermissionFlagsBits,
    TextChannel,
} from "discord.js";
import { db } from "../../services/database";
import { t } from "../../services/localization";
import { successEmbed, errorEmbed } from "../../utils/embed";
import { PRIVATE_RESPONSE_FLAGS, PRIVATE_RESPONSE_NOTICE } from "../../utils/private-response";

export const data = new SlashCommandBuilder()
    .setName("leave-setup")
    .setNameLocalizations({ ko: t("commands.leave-setup.name") })
    .setDescription("Set up leave messages for departing members")
    .setDescriptionLocalizations({ ko: t("commands.leave-setup.description") })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((option) =>
        option
            .setName("channel")
            .setNameLocalizations({ ko: "채널" })
            .setDescription("Channel to send leave messages")
            .setDescriptionLocalizations({ ko: t("commands.leave-setup.options.channel") })
            .setRequired(true)
    )
    .addStringOption((option) =>
        option
            .setName("message")
            .setNameLocalizations({ ko: "메시지" })
            .setDescription("Leave message (Variables: {user}, {username}, {server})")
            .setDescriptionLocalizations({ ko: t("commands.leave-setup.options.message") })
            .setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
        return interaction.reply({
            content: PRIVATE_RESPONSE_NOTICE,
            embeds: [errorEmbed(t("errors.guild_only"))],
            flags: PRIVATE_RESPONSE_FLAGS,
        });
    }

    const channel = interaction.options.getChannel("channel", true) as TextChannel;
    const message = interaction.options.getString("message");

    await db.guild.upsert({
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
        content: PRIVATE_RESPONSE_NOTICE,
        embeds: [successEmbed(t("commands.leave-setup.success"))],
        flags: PRIVATE_RESPONSE_FLAGS,
    });
}
