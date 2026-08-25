import {
    ApplicationCommandType,
    ContextMenuCommandBuilder,
    MessageContextMenuCommandInteraction,
} from "discord.js";
import { db } from "../../services/database";
import { PRIVATE_RESPONSE_FLAGS, withPrivateNotice } from "../../utils/private-response";

const pendingUsers = new Set<string>();

function promotionTitle(content: string, displayName: string): string {
    const firstLine = content
        .split(/\r?\n/)
        .map(line => line.trim())
        .find(Boolean);

    return (firstLine || `${displayName}님의 홍보`).slice(0, 100);
}

export const data = new ContextMenuCommandBuilder()
    .setName("Promote Message")
    .setNameLocalizations({ ko: "홍보로 등록" })
    .setType(ApplicationCommandType.Message);

export async function execute(interaction: MessageContextMenuCommandInteraction) {
    if (!interaction.guildId) {
        return interaction.reply({
            content: withPrivateNotice("서버에서 작성한 메시지만 홍보로 등록할 수 있습니다."),
            flags: PRIVATE_RESPONSE_FLAGS,
        });
    }

    const sourceMessage = interaction.targetMessage;
    if (sourceMessage.author.id !== interaction.user.id) {
        return interaction.reply({
            content: withPrivateNotice("본인이 작성한 메시지만 홍보로 등록할 수 있습니다."),
            flags: PRIVATE_RESPONSE_FLAGS,
        });
    }
    if (sourceMessage.author.bot || sourceMessage.webhookId) {
        return interaction.reply({
            content: withPrivateNotice("봇이나 웹후크가 작성한 메시지는 홍보로 등록할 수 없습니다."),
            flags: PRIVATE_RESPONSE_FLAGS,
        });
    }

    const hasPromotionalContent = Boolean(
        sourceMessage.content.trim()
        || sourceMessage.attachments.size
        || sourceMessage.embeds.length
        || sourceMessage.stickers.size
    );
    if (!hasPromotionalContent) {
        return interaction.reply({
            content: withPrivateNotice("글, 링크, 사진 또는 파일이 들어 있는 메시지를 선택해 주세요."),
            flags: PRIVATE_RESPONSE_FLAGS,
        });
    }

    const settings = await db.guild.findUnique({ where: { id: interaction.guildId } });
    if (!settings?.promotionChannelId) {
        return interaction.reply({
            content: withPrivateNotice("아직 홍보 채널이 설정되지 않았습니다. 관리자에게 `/홍보설정`을 요청해 주세요."),
            flags: PRIVATE_RESPONSE_FLAGS,
        });
    }
    if (sourceMessage.channelId === settings.promotionChannelId) {
        return interaction.reply({
            content: withPrivateNotice("이미 홍보 채널에 올라간 메시지입니다."),
            flags: PRIVATE_RESPONSE_FLAGS,
        });
    }

    const pendingKey = `${interaction.guildId}:${interaction.user.id}`;
    if (pendingUsers.has(pendingKey)) {
        return interaction.reply({
            content: withPrivateNotice("앞서 요청한 홍보를 게시하고 있습니다. 잠시만 기다려 주세요."),
            flags: PRIVATE_RESPONSE_FLAGS,
        });
    }

    pendingUsers.add(pendingKey);
    try {
        await interaction.deferReply({ flags: PRIVATE_RESPONSE_FLAGS });

        const promotionChannel = await interaction.client.channels.fetch(settings.promotionChannelId);
        if (!promotionChannel?.isTextBased() || promotionChannel.isDMBased()) {
            return interaction.editReply({
                content: withPrivateNotice("설정된 홍보 채널을 사용할 수 없습니다. 관리자에게 `/홍보설정`을 다시 요청해 주세요."),
            });
        }

        const posted = await sourceMessage.forward(promotionChannel);
        const displayName = interaction.member && "displayName" in interaction.member
            ? interaction.member.displayName
            : interaction.user.globalName || interaction.user.username;

        await db.promotionPost.create({
            guildId: interaction.guildId,
            userId: interaction.user.id,
            channelId: promotionChannel.id,
            messageId: posted.id,
            title: promotionTitle(sourceMessage.content, displayName),
        });

        return interaction.editReply({
            content: withPrivateNotice(`작성한 메시지를 ${promotionChannel.toString()}에 그대로 전달했습니다.\n${posted.url}`),
        });
    } catch (error) {
        console.error("[promotion-submit] 메시지 전달 실패:", error);
        const content = withPrivateNotice(
            "메시지를 홍보 채널로 전달하지 못했습니다. 봇의 채널 보기·메시지 보내기 권한을 확인해 주세요."
        );
        if (interaction.deferred || interaction.replied) {
            return interaction.editReply({ content }).catch(() => undefined);
        }
        return interaction.reply({ content, flags: PRIVATE_RESPONSE_FLAGS }).catch(() => undefined);
    } finally {
        pendingUsers.delete(pendingKey);
    }
}
