import {
    ActionRowBuilder,
    ChatInputCommandInteraction,
    ComponentType,
    EmbedBuilder,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
} from "discord.js";
import { db, PromotionPost } from "../../services/database";
import { PRIVATE_RESPONSE_FLAGS, withPrivateNotice } from "../../utils/private-response";

const MENU_TIMEOUT_MS = 5 * 60 * 1000;

function messageUrl(post: PromotionPost): string {
    return `https://discord.com/channels/${post.guildId}/${post.channelId}/${post.messageId}`;
}

function formatDate(value: string): string {
    return new Intl.DateTimeFormat("ko-KR", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Seoul",
    }).format(new Date(value));
}

function buildMenu(posts: PromotionPost[], disabled = false) {
    const menu = new StringSelectMenuBuilder()
        .setCustomId("promotion-delete-select")
        .setPlaceholder("삭제할 홍보를 선택하세요")
        .setMinValues(1)
        .setMaxValues(1)
        .setDisabled(disabled)
        .addOptions(posts.map(post => ({
            label: post.title.slice(0, 100),
            description: formatDate(post.createdAt).slice(0, 100),
            value: String(post.id),
        })));
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

async function syncRecentPromotionPosts(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guildId || !interaction.client.user) return;
    const settings = await db.guild.findUnique({ where: { id: interaction.guildId } });
    if (!settings?.promotionChannelId) return;

    try {
        const channel = await interaction.client.channels.fetch(settings.promotionChannelId);
        if (!channel?.isTextBased() || channel.isDMBased()) return;

        const messages = await channel.messages.fetch({ limit: 100 });
        for (const message of messages.values()) {
            if (message.author.id !== interaction.client.user.id) continue;
            const promoterField = message.embeds
                .flatMap(embed => embed.fields)
                .find(field => field.name === "홍보자");
            if (promoterField?.value.trim() !== `<@${interaction.user.id}>`) continue;
            if (await db.promotionPost.findByMessageId(message.id)) continue;

            const title = message.embeds.find(embed => embed.title)?.title || "제목 없는 홍보";
            await db.promotionPost.create({
                guildId: interaction.guildId,
                userId: interaction.user.id,
                channelId: channel.id,
                messageId: message.id,
                title,
                createdAt: message.createdAt.toISOString(),
            });
        }
    } catch (error) {
        console.warn("[promotion-delete] 기존 홍보 목록 동기화 실패:", error);
    }
}

export const data = new SlashCommandBuilder()
    .setName("promotion-delete")
    .setNameLocalizations({ ko: "홍보삭제" })
    .setDescription("Show and delete promotions you submitted")
    .setDescriptionLocalizations({ ko: "내가 올린 홍보를 목록에서 선택해 삭제합니다" });

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
        return interaction.reply({
            content: withPrivateNotice("서버에서만 사용할 수 있는 명령어입니다."),
            flags: PRIVATE_RESPONSE_FLAGS,
        });
    }

    await interaction.deferReply({ flags: PRIVATE_RESPONSE_FLAGS });
    await syncRecentPromotionPosts(interaction);

    const posts = await db.promotionPost.findMany({
        guildId: interaction.guildId,
        userId: interaction.user.id,
        limit: 25,
    });
    if (!posts.length) {
        return interaction.editReply({
            content: withPrivateNotice("삭제할 수 있는 홍보가 없습니다."),
        });
    }

    const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("내 홍보 목록")
        .setDescription(
            posts.map((post, index) =>
                `**${index + 1}. ${post.title}**\n${formatDate(post.createdAt)} · [게시물 보기](${messageUrl(post)})`
            ).join("\n\n").slice(0, 4000)
        );

    await interaction.editReply({
        content: withPrivateNotice("아래에서 삭제할 홍보를 선택해 주세요."),
        embeds: [embed],
        components: [buildMenu(posts)],
    });

    const reply = await interaction.fetchReply();
    const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: MENU_TIMEOUT_MS,
        max: 1,
        filter: selection => selection.user.id === interaction.user.id,
    });

    collector.on("collect", async selection => {
        try {
            await selection.deferUpdate();
            const selectedId = Number(selection.values[0]);
            const post = await db.promotionPost.findUnique(selectedId);
            if (!post || post.guildId !== interaction.guildId || post.userId !== interaction.user.id) {
                return interaction.editReply({
                    content: withPrivateNotice("선택한 홍보를 찾을 수 없거나 삭제 권한이 없습니다."),
                    embeds: [],
                    components: [],
                });
            }

            let alreadyGone = false;
            try {
                const channel = await interaction.client.channels.fetch(post.channelId);
                if (!channel?.isTextBased() || channel.isDMBased()) {
                    alreadyGone = true;
                } else {
                    const message = await channel.messages.fetch(post.messageId);
                    await message.delete();
                }
            } catch (error) {
                const code = (error as { code?: number }).code;
                if (code === 10003 || code === 10008) {
                    alreadyGone = true;
                } else {
                    throw error;
                }
            }

            await db.promotionPost.delete(post.id);
            return interaction.editReply({
                content: withPrivateNotice(
                    alreadyGone
                        ? "게시물이 이미 삭제되어 목록에서 정리했습니다."
                        : `**${post.title}** 홍보를 삭제했습니다.`
                ),
                embeds: [],
                components: [],
            });
        } catch (error) {
            console.error("[promotion-delete] 홍보 삭제 실패:", error);
            return interaction.editReply({
                content: withPrivateNotice("홍보를 삭제하지 못했습니다. 봇의 메시지 관리 권한을 확인해 주세요."),
                embeds: [],
                components: [],
            });
        }
    });

    collector.on("end", async (_collected, reason) => {
        if (reason !== "time") return;
        await interaction.editReply({
            content: withPrivateNotice("선택 시간이 만료되었습니다. 다시 `/홍보삭제`를 실행해 주세요."),
            components: [buildMenu(posts, true)],
        }).catch(() => undefined);
    });
}

