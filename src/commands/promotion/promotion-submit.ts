import {
    ActionRowBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    ModalBuilder,
    SlashCommandBuilder,
    TextInputBuilder,
    TextInputStyle,
} from "discord.js";
import { db } from "../../services/database";
import { getLinkPreview } from "../../services/link-preview";
import { PRIVATE_RESPONSE_FLAGS, withPrivateNotice } from "../../utils/private-response";

const pendingUsers = new Set<string>();
const MODAL_TIMEOUT_MS = 10 * 60 * 1000;

function previewFieldValue(link: string, preview: Awaited<ReturnType<typeof getLinkPreview>>): string {
    const lines: string[] = [];
    if (preview?.title) lines.push(`**${preview.title.slice(0, 200)}**`);
    if (preview?.siteName) lines.push(preview.siteName.slice(0, 100));
    if (preview?.description) lines.push(preview.description.slice(0, 500));
    lines.push(`🔗 ${link}`);
    return lines.join("\n").slice(0, 1024);
}

interface DetectedLink {
    original: string;
    url: string;
}

function normalizeLink(value: string): string | undefined {
    let candidate = value.trim();
    while (/[.,!?;:'"\])}]$/.test(candidate)) candidate = candidate.slice(0, -1);
    if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`;

    try {
        const parsed = new URL(candidate);
        if ((parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.hostname.includes(".")) {
            return parsed.toString();
        }
    } catch {
        // 올바른 웹 주소가 아닙니다.
    }
    return undefined;
}

function findFirstUrl(...values: string[]): DetectedLink | undefined {
    for (const value of values) {
        const match = value.match(
            /(?:https?:\/\/[^\s<>]+|(?:www\.)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(?::\d{2,5})?(?:\/[^\s<>]*)?)/i
        );
        if (!match) continue;

        let original = match[0];
        while (/[.,!?;:'"\])}]$/.test(original)) original = original.slice(0, -1);
        const url = normalizeLink(original);
        if (url) return { original, url };
    }
    return undefined;
}

function removeLinkFromText(value: string, link: string | undefined, multiline = false): string {
    if (!link) return value.trim();
    const cleaned = value
        .replace(`<${link}>`, "")
        .replace(link, "")
        .trim();
    if (multiline) return cleaned.replace(/[ \t]+\n/g, "\n");
    return cleaned
        .replace(/\s{2,}/g, " ")
        .replace(/^[-–—|:]+|[-–—|:]+$/g, "")
        .trim();
}

export const data = new SlashCommandBuilder()
    .setName("promotion-submit")
    .setNameLocalizations({ ko: "홍보신청" })
    .setDescription("Submit a promotion to the server promotion channel")
    .setDescriptionLocalizations({ ko: "사진을 선택한 뒤 긴 홍보 글을 작성해 게시합니다" })
    .addStringOption(option =>
        option
            .setName("link")
            .setNameLocalizations({ ko: "링크" })
            .setDescription("Optional link; domains in the title or content are detected automatically")
            .setDescriptionLocalizations({ ko: "선택 사항: discord.gg처럼 적어도 자동으로 인식합니다" })
            .setMaxLength(500)
            .setRequired(false)
    )
    .addAttachmentOption(option =>
        option
            .setName("image")
            .setNameLocalizations({ ko: "이미지" })
            .setDescription("Optional promotional image")
            .setDescriptionLocalizations({ ko: "선택 사항: 홍보 이미지" })
            .setRequired(false)
    )
    .addAttachmentOption(option =>
        option
            .setName("image-2")
            .setNameLocalizations({ ko: "이미지2" })
            .setDescription("Optional second promotional image")
            .setDescriptionLocalizations({ ko: "선택 사항: 두 번째 홍보 이미지" })
            .setRequired(false)
    )
    .addAttachmentOption(option =>
        option
            .setName("image-3")
            .setNameLocalizations({ ko: "이미지3" })
            .setDescription("Optional third promotional image")
            .setDescriptionLocalizations({ ko: "선택 사항: 세 번째 홍보 이미지" })
            .setRequired(false)
    )
    .addAttachmentOption(option =>
        option
            .setName("image-4")
            .setNameLocalizations({ ko: "이미지4" })
            .setDescription("Optional fourth promotional image")
            .setDescriptionLocalizations({ ko: "선택 사항: 네 번째 홍보 이미지" })
            .setRequired(false)
    )
    .addAttachmentOption(option =>
        option
            .setName("image-5")
            .setNameLocalizations({ ko: "이미지5" })
            .setDescription("Optional fifth promotional image")
            .setDescriptionLocalizations({ ko: "선택 사항: 다섯 번째 홍보 이미지" })
            .setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
        return interaction.reply({
            content: withPrivateNotice("서버에서만 사용할 수 있는 명령어입니다."),
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

    const submittedLink = interaction.options.getString("link")?.trim();
    const normalizedSubmittedLink = submittedLink ? normalizeLink(submittedLink) : undefined;
    if (submittedLink && !normalizedSubmittedLink) {
        return interaction.reply({
            content: withPrivateNotice("올바른 웹 주소를 입력해 주세요. `https://`는 생략해도 됩니다."),
            flags: PRIVATE_RESPONSE_FLAGS,
        });
    }
    const images = ["image", "image-2", "image-3", "image-4", "image-5"]
        .map(name => interaction.options.getAttachment(name))
        .filter(image => image !== null);
    if (images.some(image => image.contentType && !image.contentType.startsWith("image/"))) {
        return interaction.reply({
            content: withPrivateNotice("이미지 항목에는 이미지 파일만 첨부할 수 있습니다. 최대 5장까지 가능합니다."),
            flags: PRIVATE_RESPONSE_FLAGS,
        });
    }

    const modalId = `promotion-submit:${interaction.id}`;
    const modal = new ModalBuilder()
        .setCustomId(modalId)
        .setTitle("홍보 글 작성")
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId("promotion-title")
                    .setLabel("제목")
                    .setStyle(TextInputStyle.Short)
                    .setMaxLength(100)
                    .setRequired(true)
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId("promotion-content")
                    .setLabel("본문")
                    .setPlaceholder("줄바꿈을 포함해 자유롭게 작성하세요.")
                    .setStyle(TextInputStyle.Paragraph)
                    .setMaxLength(4000)
                    .setRequired(true)
            )
        );

    await interaction.showModal(modal);
    const modalSubmit = await interaction.awaitModalSubmit({
        filter: submitted => submitted.customId === modalId && submitted.user.id === interaction.user.id,
        time: MODAL_TIMEOUT_MS,
    }).catch(() => null);
    if (!modalSubmit) return;

    const pendingKey = `${interaction.guildId}:${interaction.user.id}`;
    if (pendingUsers.has(pendingKey)) {
        return modalSubmit.reply({
            content: withPrivateNotice("이미 홍보를 게시하고 있습니다. 잠시만 기다려 주세요."),
            flags: PRIVATE_RESPONSE_FLAGS,
        });
    }

    const submittedTitle = modalSubmit.fields.getTextInputValue("promotion-title");
    const submittedContent = modalSubmit.fields.getTextInputValue("promotion-content");
    const autoDetectedLink = submittedLink ? undefined : findFirstUrl(submittedTitle, submittedContent);
    const link = normalizedSubmittedLink || autoDetectedLink?.url;
    const linkTextInMessage = autoDetectedLink?.original;

    pendingUsers.add(pendingKey);
    try {
        await modalSubmit.deferReply({ flags: PRIVATE_RESPONSE_FLAGS });
        const channel = await modalSubmit.client.channels.fetch(settings.promotionChannelId);
        if (!channel?.isTextBased() || channel.isDMBased()) {
            return modalSubmit.editReply({
                content: withPrivateNotice("설정된 홍보 채널을 사용할 수 없습니다. 관리자에게 `/홍보설정`을 다시 요청해 주세요."),
            });
        }

        const displayName = modalSubmit.user.globalName || modalSubmit.user.username;
        let linkPreview: Awaited<ReturnType<typeof getLinkPreview>> = null;
        if (link) {
            try {
                linkPreview = await getLinkPreview(link);
            } catch (error) {
                console.warn(`[promotion] 링크 미리보기 생성 실패 (${link}):`, error);
            }
        }

        const title = removeLinkFromText(submittedTitle, linkTextInMessage)
            || linkPreview?.title?.slice(0, 100)
            || "홍보";
        const content = removeLinkFromText(submittedContent, linkTextInMessage, true)
            || linkPreview?.description?.slice(0, 4000)
            || "아래 링크를 확인해 주세요.";

        const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle(title)
            .setDescription(content)
            .setAuthor({
                name: `${displayName}님의 홍보`,
                iconURL: modalSubmit.user.displayAvatarURL(),
            })
            .addFields({
                name: "홍보자",
                value: `<@${modalSubmit.user.id}>`,
                inline: false,
            })
            .setTimestamp();

        if (link) {
            embed.addFields({
                name: "\u200b",
                value: `\u200b\n${previewFieldValue(link, linkPreview)}`,
                inline: false,
            });
        }
        if (images.length > 0) {
            embed.setImage(images[0].url);
            if (linkPreview?.imageUrl) embed.setThumbnail(linkPreview.imageUrl);
        } else if (linkPreview?.imageUrl) {
            embed.setImage(linkPreview.imageUrl);
        }

        const embeds = [
            embed,
            ...images.slice(1).map(image =>
                new EmbedBuilder()
                    .setColor(0x5865f2)
                    .setImage(image.url)
            ),
        ];

        const posted = await channel.send({
            embeds,
            allowedMentions: { parse: [] },
        });
        await db.promotionPost.create({
            guildId: interaction.guildId,
            userId: modalSubmit.user.id,
            channelId: channel.id,
            messageId: posted.id,
            title,
        });
        return modalSubmit.editReply({
            content: withPrivateNotice(
                `홍보가 ${channel.toString()}에 게시되었습니다.${autoDetectedLink ? "\n제목 또는 내용의 주소를 자동으로 인식했습니다." : ""}\n${posted.url}`
            ),
        });
    } catch (error) {
        console.error("[promotion-submit] 홍보 게시 실패:", error);
        const content = withPrivateNotice("홍보를 게시하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        if (modalSubmit.deferred || modalSubmit.replied) {
            return modalSubmit.editReply({ content }).catch(() => undefined);
        }
        return modalSubmit.reply({ content, flags: PRIVATE_RESPONSE_FLAGS }).catch(() => undefined);
    } finally {
        pendingUsers.delete(pendingKey);
    }
}

