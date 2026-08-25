"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const database_1 = require("../../services/database");
const private_response_1 = require("../../utils/private-response");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName("promotion-setup")
    .setNameLocalizations({ ko: "홍보설정" })
    .setDescription("Configure the channel where promotions are posted")
    .setDescriptionLocalizations({ ko: "홍보가 자동 게시될 채널과 재신청 대기시간을 설정합니다" })
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageGuild)
    .addChannelOption(option => option
    .setName("channel")
    .setNameLocalizations({ ko: "채널" })
    .setDescription("Channel where promotions will be posted")
    .setDescriptionLocalizations({ ko: "홍보 글이 게시될 읽기 전용 채널" })
    .addChannelTypes(discord_js_1.ChannelType.GuildText, discord_js_1.ChannelType.GuildAnnouncement)
    .setRequired(true))
    .addIntegerOption(option => option
    .setName("cooldown-hours")
    .setNameLocalizations({ ko: "대기시간" })
    .setDescription("Hours each member must wait before submitting again (0 disables)")
    .setDescriptionLocalizations({ ko: "한 사람이 다시 홍보할 때까지 기다릴 시간 (0이면 제한 없음)" })
    .setMinValue(0)
    .setMaxValue(720)
    .setRequired(false));
async function execute(interaction) {
    if (!interaction.guildId) {
        return interaction.reply({
            content: (0, private_response_1.withPrivateNotice)("서버에서만 사용할 수 있는 명령어입니다."),
            flags: private_response_1.PRIVATE_RESPONSE_FLAGS,
        });
    }
    const channel = interaction.options.getChannel("channel", true);
    const cooldownHours = interaction.options.getInteger("cooldown-hours") ?? 24;
    await database_1.db.guild.upsert({
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
        content: (0, private_response_1.withPrivateNotice)(`홍보 채널을 ${channel.toString()}로 설정했습니다.\n재신청 대기시간: **${cooldownText}**\n채널 권한에서 일반 멤버의 메시지 전송을 차단해 주세요.`),
        flags: private_response_1.PRIVATE_RESPONSE_FLAGS,
    });
}

