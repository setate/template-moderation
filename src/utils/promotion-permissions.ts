import {
    ChatInputCommandInteraction,
    MessageContextMenuCommandInteraction,
    PermissionFlagsBits,
} from "discord.js";

const PROMOTION_ADMIN_ROLE_NAMES = new Set(["probe", "admin"]);

type PromotionInteraction = ChatInputCommandInteraction | MessageContextMenuCommandInteraction;

export async function hasPromotionAdminAccess(interaction: PromotionInteraction): Promise<boolean> {
    if (!interaction.guild) return false;
    if (interaction.guild.ownerId === interaction.user.id) return true;

    const member = interaction.guild.members.cache.get(interaction.user.id)
        || await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    if (!member) return false;

    return member.permissions.has(PermissionFlagsBits.Administrator)
        || member.roles.cache.some(role => PROMOTION_ADMIN_ROLE_NAMES.has(role.name.trim().toLowerCase()));
}
