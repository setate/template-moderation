"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const database_1 = require("../../services/database");
const guild_members_1 = require("../../services/guild-members");
const private_response_1 = require("../../utils/private-response");
const promotion_permissions_1 = require("../../utils/promotion-permissions");
const promotion_display_1 = require("../../utils/promotion-display");
const pendingUsers = new Set();
function promotionTitle(content, displayName) {
    const firstLine = content
        .split(/\r?\n/)
        .map(line => line.trim())
        .find(Boolean);
    return (firstLine || `${displayName}님의 홍보`).slice(0, 100);
}
exports.data = new discord_js_1.ContextMenuCommandBuilder()
    .setName("Promote Message")
    .setNameLocalizations({ ko: "홍보로 등록" })
    .setType(discord_js_1.ApplicationCommandType.Message);
async function execute(interaction) {
    if (!interaction.guildId) {
        return interaction.reply({
            content: (0, private_response_1.withPrivateNotice)("서버에서 작성한 메시지만 홍보로 등록할 수 있습니다."),
            flags: private_response_1.PRIVATE_RESPONSE_FLAGS,
        });
    }
    const sourceMessage = interaction.targetMessage;
    const hasAdminAccess = await (0, promotion_permissions_1.hasPromotionAdminAccess)(interaction);
    if (sourceMessage.author.id !== interaction.user.id && !hasAdminAccess) {
        return interaction.reply({
            content: (0, private_response_1.withPrivateNotice)("본인이 작성한 메시지만 홍보로 등록할 수 있습니다. 홍보 관리자는 다른 사용자의 메시지도 등록할 수 있습니다."),
            flags: private_response_1.PRIVATE_RESPONSE_FLAGS,
        });
    }
    if (sourceMessage.author.bot || sourceMessage.webhookId) {
        return interaction.reply({
            content: (0, private_response_1.withPrivateNotice)("봇이나 웹후크가 작성한 메시지는 홍보로 등록할 수 없습니다."),
            flags: private_response_1.PRIVATE_RESPONSE_FLAGS,
        });
    }
    const hasPromotionalContent = Boolean(sourceMessage.content.trim()
        || sourceMessage.attachments.size
        || sourceMessage.embeds.length
        || sourceMessage.stickers.size);
    if (!hasPromotionalContent) {
        return interaction.reply({
            content: (0, private_response_1.withPrivateNotice)("글, 링크, 사진 또는 파일이 들어 있는 메시지를 선택해 주세요."),
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
    if (sourceMessage.channelId === settings.promotionChannelId) {
        return interaction.reply({
            content: (0, private_response_1.withPrivateNotice)("이미 홍보 채널에 올라간 메시지입니다."),
            flags: private_response_1.PRIVATE_RESPONSE_FLAGS,
        });
    }
    const pendingKey = `${interaction.guildId}:${interaction.user.id}`;
    if (pendingUsers.has(pendingKey)) {
        return interaction.reply({
            content: (0, private_response_1.withPrivateNotice)("앞서 요청한 홍보를 게시하고 있습니다. 잠시만 기다려 주세요."),
            flags: private_response_1.PRIVATE_RESPONSE_FLAGS,
        });
    }
    pendingUsers.add(pendingKey);
    try {
        await interaction.deferReply({ flags: private_response_1.PRIVATE_RESPONSE_FLAGS });
        const promotionChannel = await interaction.client.channels.fetch(settings.promotionChannelId);
        if (!promotionChannel?.isTextBased() || promotionChannel.isDMBased()) {
            return interaction.editReply({
                content: (0, private_response_1.withPrivateNotice)("설정된 홍보 채널을 사용할 수 없습니다. 관리자에게 `/홍보설정`을 다시 요청해 주세요."),
            });
        }
        const members = interaction.guild
            ? await (0, guild_members_1.fetchGuildMembers)(interaction.guild).catch(() => interaction.guild.members.cache)
            : undefined;
        const registrarName = members?.get(interaction.user.id)?.displayName
            || interaction.user.globalName
            || interaction.user.username;
        const authorName = members?.get(sourceMessage.author.id)?.displayName
            || sourceMessage.member?.displayName
            || sourceMessage.author.globalName
            || sourceMessage.author.username;
        const registrationNotice = (0, promotion_display_1.buildPromotionRegistrationNotice)(registrarName, authorName, sourceMessage.author.id === interaction.user.id);
        const notice = await promotionChannel.send({
            content: registrationNotice,
            allowedMentions: { parse: [] },
        });
        let posted;
        try {
            posted = await sourceMessage.forward(promotionChannel);
        }
        catch (error) {
            await notice.delete().catch(() => undefined);
            throw error;
        }
        const displayName = authorName;
        await database_1.db.promotionPost.create({
            guildId: interaction.guildId,
            userId: sourceMessage.author.id,
            channelId: promotionChannel.id,
            messageId: posted.id,
            noticeMessageId: notice.id,
            title: promotionTitle(sourceMessage.content, displayName),
        });
        return interaction.editReply({
            content: (0, private_response_1.withPrivateNotice)(`작성한 메시지를 ${promotionChannel.toString()}에 그대로 전달했습니다.\n${posted.url}`),
        });
    }
    catch (error) {
        console.error("[promotion-submit] 메시지 전달 실패:", error);
        const code = error.code;
        const reason = code === 160014
            ? "봇이 원본 메시지 내용을 읽을 수 없습니다. 원본 채널의 채널 보기·메시지 기록 보기 권한을 확인해 주세요."
            : code === 50013
                ? "봇 권한이 부족합니다. 원본 및 홍보 채널의 채널 보기·메시지 기록 보기·메시지 보내기 권한을 확인해 주세요."
                : "메시지를 홍보 채널로 전달하지 못했습니다. 잠시 후 다시 시도해 주세요.";
        const content = (0, private_response_1.withPrivateNotice)(reason);
        if (interaction.deferred || interaction.replied) {
            return interaction.editReply({ content }).catch(() => undefined);
        }
        return interaction.reply({ content, flags: private_response_1.PRIVATE_RESPONSE_FLAGS }).catch(() => undefined);
    }
    finally {
        pendingUsers.delete(pendingKey);
    }
}
