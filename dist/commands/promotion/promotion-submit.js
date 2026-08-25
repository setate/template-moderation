"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const database_1 = require("../../services/database");
const private_response_1 = require("../../utils/private-response");
const pendingUsers = new Set();
function remainingCooldown(lastSubmittedAt, cooldownHours) {
    const availableAt = new Date(lastSubmittedAt).getTime() + cooldownHours * 60 * 60 * 1000;
    return Math.max(0, availableAt - Date.now());
}
function formatRemaining(milliseconds) {
    const minutes = Math.ceil(milliseconds / 60000);
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    if (hours === 0)
        return `${remainder}분`;
    if (remainder === 0)
        return `${hours}시간`;
    return `${hours}시간 ${remainder}분`;
}
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName("promotion-submit")
    .setNameLocalizations({ ko: "홍보신청" })
    .setDescription("Submit a promotion to the server promotion channel")
    .setDescriptionLocalizations({ ko: "홍보 채널에 홍보 글을 바로 게시합니다" })
    .addStringOption(option => option
    .setName("title")
    .setNameLocalizations({ ko: "제목" })
    .setDescription("Promotion title")
    .setDescriptionLocalizations({ ko: "홍보 제목" })
    .setMaxLength(100)
    .setRequired(true))
    .addStringOption(option => option
    .setName("content")
    .setNameLocalizations({ ko: "내용" })
    .setDescription("Promotion details")
    .setDescriptionLocalizations({ ko: "홍보 내용" })
    .setMaxLength(2000)
    .setRequired(true))
    .addStringOption(option => option
    .setName("link")
    .setNameLocalizations({ ko: "링크" })
    .setDescription("Optional link beginning with http:// or https://")
    .setDescriptionLocalizations({ ko: "선택 사항: http:// 또는 https://로 시작하는 링크" })
    .setMaxLength(500)
    .setRequired(false))
    .addAttachmentOption(option => option
    .setName("image")
    .setNameLocalizations({ ko: "이미지" })
    .setDescription("Optional promotional image")
    .setDescriptionLocalizations({ ko: "선택 사항: 홍보 이미지" })
    .setRequired(false));
async function execute(interaction) {
    if (!interaction.guildId) {
        return interaction.reply({
            content: (0, private_response_1.withPrivateNotice)("서버에서만 사용할 수 있는 명령어입니다."),
            flags: private_response_1.PRIVATE_RESPONSE_FLAGS,
        });
    }
    const settings = await database_1.db.guild.findUnique({ where: { id: interaction.guildId } });
    if (!settings?.promotionChannelId) {
        return interaction.reply({
            content: (0, private_response_1.withPrivateNotice)("아직 홍보 채널이 설정되지 않았습니다. 관리자에게 `/홍보설정`을 요청해 주세요."),
            flags: private_response_1.PRIVATE_RESPONSE_FLAGS,
        });
    }
    const cooldownHours = settings.promotionCooldownHours ?? 24;
    const lastSubmittedAt = settings.promotionLastSubmittedAt?.[interaction.user.id];
    if (cooldownHours > 0 && lastSubmittedAt) {
        const remaining = remainingCooldown(lastSubmittedAt, cooldownHours);
        if (remaining > 0) {
            return interaction.reply({
                content: (0, private_response_1.withPrivateNotice)(`다음 홍보까지 **${formatRemaining(remaining)}** 남았습니다.`),
                flags: private_response_1.PRIVATE_RESPONSE_FLAGS,
            });
        }
    }
    const pendingKey = `${interaction.guildId}:${interaction.user.id}`;
    if (pendingUsers.has(pendingKey)) {
        return interaction.reply({
            content: (0, private_response_1.withPrivateNotice)("이미 홍보를 게시하고 있습니다. 잠시만 기다려 주세요."),
            flags: private_response_1.PRIVATE_RESPONSE_FLAGS,
        });
    }
    const link = interaction.options.getString("link")?.trim();
    if (link) {
        try {
            const parsed = new URL(link);
            if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
                throw new Error("invalid protocol");
        }
        catch {
            return interaction.reply({
                content: (0, private_response_1.withPrivateNotice)("링크는 `http://` 또는 `https://`로 시작하는 올바른 주소여야 합니다."),
                flags: private_response_1.PRIVATE_RESPONSE_FLAGS,
            });
        }
    }
    const image = interaction.options.getAttachment("image");
    if (image?.contentType && !image.contentType.startsWith("image/")) {
        return interaction.reply({
            content: (0, private_response_1.withPrivateNotice)("이미지 항목에는 이미지 파일만 첨부할 수 있습니다."),
            flags: private_response_1.PRIVATE_RESPONSE_FLAGS,
        });
    }
    pendingUsers.add(pendingKey);
    await interaction.deferReply({ flags: private_response_1.PRIVATE_RESPONSE_FLAGS });
    try {
        const channel = await interaction.client.channels.fetch(settings.promotionChannelId);
        if (!channel?.isTextBased() || channel.isDMBased()) {
            return interaction.editReply({
                content: (0, private_response_1.withPrivateNotice)("설정된 홍보 채널을 사용할 수 없습니다. 관리자에게 `/홍보설정`을 다시 요청해 주세요."),
            });
        }
        const title = interaction.options.getString("title", true);
        const content = interaction.options.getString("content", true);
        const displayName = interaction.user.globalName || interaction.user.username;
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle(title)
            .setDescription(content)
            .setAuthor({
            name: `${displayName}님의 홍보`,
            iconURL: interaction.user.displayAvatarURL(),
        })
            .addFields({
            name: "홍보자",
            value: `<@${interaction.user.id}>`,
            inline: false,
        })
            .setTimestamp();
        if (link) {
            embed.setURL(link);
        }
        if (image)
            embed.setImage(image.url);
        const posted = await channel.send({
            content: link || undefined,
            embeds: [embed],
            allowedMentions: { parse: [] },
        });
        await database_1.db.guild.recordPromotion(interaction.guildId, interaction.user.id);
        return interaction.editReply({
            content: (0, private_response_1.withPrivateNotice)(`홍보가 ${channel.toString()}에 게시되었습니다.\n${posted.url}`),
        });
    }
    finally {
        pendingUsers.delete(pendingKey);
    }
}

