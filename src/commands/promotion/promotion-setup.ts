import {
    ChannelType,
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    SlashCommandBuilder,
    TextChannel,
} from "discord.js";
import { db } from "../../services/database";
import { PRIVATE_RESPONSE_FLAGS, withPrivateNotice } from "../../utils/private-response";

export const data = new SlashCommandBuilder()
    .setName("promotion-setup")
    .setNameLocalizations({ ko: "홍보설정" })
    .setDescription("Configure the channel where promotions are posted")
    .setDescriptionLocalizations({ ko: "홍보가 자동 게시될 채널을 설정합니다" })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(option =>
        option
            .setName("channel")
            .setNameLocalizations({ ko: "채널" })
            .setDescription("Channel where promotions will be posted")
            .setDescriptionLocalizations({ ko: "홍보 글이 게시될 읽기 전용 채널" })
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
        return interaction.reply({
            content: withPrivateNotice("서버에서만 사용할 수 있는 명령어입니다."),
            flags: PRIVATE_RESPONSE_FLAGS,
        });
    }

    const channel = interaction.options.getChannel("channel", true) as TextChannel;

    await db.guild.upsert({
        where: { id: interaction.guildId },
        create: {
            id: interaction.guildId,
            promotionChannelId: channel.id,
        },
        update: {
            promotionChannelId: channel.id,
        },
    });

    return interaction.reply({
        content: withPrivateNotice(
            `홍보 채널을 ${channel.toString()}로 설정했습니다.\n채널 권한에서 일반 멤버의 메시지 전송을 차단해 주세요.`
        ),
        flags: PRIVATE_RESPONSE_FLAGS,
    });
}

