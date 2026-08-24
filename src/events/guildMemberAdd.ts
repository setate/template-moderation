import { GuildMember, TextChannel } from "discord.js";
import { db } from "../services/database";
import { t } from "../services/localization";
import { createEmbed } from "../utils/embed";

export async function handleGuildMemberAdd(member: GuildMember) {
    await db.memberActivity.upsert({
        where: { guildId_userId: { guildId: member.guild.id, userId: member.id } },
        update: {},
        create: { guildId: member.guild.id, userId: member.id, messageCount: 0 },
    });

    const guildConfig = await db.guild.findUnique({
        where: { id: member.guild.id },
    });

    if (!guildConfig) return;

    // Send welcome message
    if (guildConfig.welcomeChannelId) {
        const channel = member.guild.channels.cache.get(guildConfig.welcomeChannelId) as TextChannel;

        if (channel) {
            const message = (guildConfig.welcomeMessage || t("events.member_join.default_message"))
                .replace(/{user}/g, member.toString())
                .replace(/{username}/g, member.user.username)
                .replace(/{server}/g, member.guild.name)
                .replace(/{memberCount}/g, member.guild.memberCount.toString());

            const embed = createEmbed("success")
                .setTitle("Welcome! 🎉")
                .setDescription(message)
                .setThumbnail(member.user.displayAvatarURL());

            await channel.send({ embeds: [embed] });
        }
    }

    // Assign auto role
    if (guildConfig.autoRoleId) {
        const role = member.guild.roles.cache.get(guildConfig.autoRoleId);

        if (role) {
            try {
                await member.roles.add(role);
            } catch (error) {
                console.error("Failed to assign auto role:", error);
            }
        }
    }
}
