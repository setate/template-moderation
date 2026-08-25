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
    .setDescriptionLocalizations({ ko: "홍보가 자동 게시될 채널과 재신청 대기시간을 설정합니다" })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(option =>
        option
            .setName("channel")
            .setNameLocalizations({ ko: "채널" })
            .setDescription("Channel where promotions will be posted")
            .setDescriptionLocalizations({ ko: "홍보 글이 게시될 읽기 전용 채널" })
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)
    )
    .addIntegerOption(option =>
        option
            .setName("cooldown-hours")
            .setNameLocalizations({ ko: "대기시간" })
            .setDescription("Hours each member must wait before submitting again (0 disables)")
            .setDescriptionLocalizations({ ko: "한 사람이 다시 홍보할 때까지 기다릴 시간 (0이면 제한 없음)" })
            .setMinValue(0)
            .setMaxValue(720)
            .setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
        return interaction.reply({
            content: withPrivateNotice("서버에서만 사용할 수 있는 명령어입니다."),
            flags: PRIVATE_RESPONSE_FLAGS,
        });
    }

    const channel = interaction.options.getChannel("channel", true) as TextChannel;
    const cooldownHours = interaction.options.getInteger("cooldown-hours") ?? 24;

    await db.guild.upsert({
        where: { id: interaction.guildId },
        create: {
            id: interaction.guildId,
            promotionChannelId: channel.id,
            promotionCooldownHours: cooldownHours,
        },
        update: {
            promotionChannelId: channel.id,
            promotionCooldownHours: cooldownHours,
        },
    });

    const cooldownText = cooldownHours === 0 ? "제한 없음" : `${cooldownHours}시간`;
    return interaction.reply({
        content: withPrivateNotice(
            `홍보 채널을 ${channel.toString()}로 설정했습니다.\n재신청 대기시간: **${cooldownText}**\n채널 권한에서 일반 멤버의 메시지 전송을 차단해 주세요.`
        ),
        flags: PRIVATE_RESPONSE_FLAGS,
    });
}

