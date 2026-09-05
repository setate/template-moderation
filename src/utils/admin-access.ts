import {
    ChatInputCommandInteraction,
    MessageContextMenuCommandInteraction,
    PermissionFlagsBits,
} from "discord.js";

const ADMIN_ROLE_NAMES = new Set(["probe", "admin"]);

type SupportedInteraction = ChatInputCommandInteraction | MessageContextMenuCommandInteraction;

export async function hasServerAdminAccess(interaction: SupportedInteraction): Promise<boolean> {
    if (!interaction.guild) return false;
    if (interaction.guild.ownerId === interaction.user.id) return true;

    const member = interaction.guild.members.cache.get(interaction.user.id)
        || await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    if (!member) return false;

    return member.permissions.has(PermissionFlagsBits.Administrator)
        || member.roles.cache.some(role => ADMIN_ROLE_NAMES.has(role.name.trim().toLowerCase()));
}
