import {
    ChannelType,
    ChatInputCommandInteraction,
    NewsChannel,
    PermissionFlagsBits,
    SlashCommandBuilder,
    SnowflakeUtil,
    TextChannel,
    ThreadChannel,
} from 'discord.js';
import {
    beginHistoricalScan,
    cancelHistoricalScan,
    finishHistoricalScan,
    isHistoricalScanActive,
} from '../../services/activity';
import { syncMemberRank } from '../../services/ranking';

type ScannableChannel = TextChannel | NewsChannel | ThreadChannel;

export const data = new SlashCommandBuilder()
    .setName('activity-scan')
    .setNameLocalizations({ ko: '활동통계수집' })
    .setDescription('Scan all accessible message history and recalculate activity ranks')
    .setDescriptionLocalizations({ ko: '접근 가능한 과거 메시지를 전부 집계하고 활동 등급을 다시 계산합니다' })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
        return interaction.reply({ content: '서버에서만 사용할 수 있습니다.', ephemeral: true });
    }

    const guild = interaction.guild;
    if (isHistoricalScanActive(guild.id)) {
        return interaction.reply({ content: '이 서버의 활동 통계를 이미 수집 중입니다.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });
    beginHistoricalScan(guild.id);
    const scanBoundaryId = SnowflakeUtil.generate({ timestamp: Date.now() }).toString();
    const counts = new Map<string, number>();
    let scannedMessages = 0;
    let scannedChannels = 0;
    let skippedChannels = 0;
    let scanFinished = false;

    try {
        await guild.channels.fetch();
        const me = guild.members.me || await guild.members.fetchMe();
        const scannableTypes = new Set<ChannelType>([
            ChannelType.GuildText,
            ChannelType.GuildAnnouncement,
            ChannelType.PublicThread,
            ChannelType.PrivateThread,
            ChannelType.AnnouncementThread,
        ]);
        const channels = guild.channels.cache
            .filter(channel => scannableTypes.has(channel.type))
            .sort((a, b) => a.id.localeCompare(b.id));

        for (const channel of channels.values()) {
            const textChannel = channel as ScannableChannel;
            const permissions = textChannel.permissionsFor(me);
            if (
                !permissions?.has(PermissionFlagsBits.ViewChannel) ||
                !permissions.has(PermissionFlagsBits.ReadMessageHistory)
            ) {
                skippedChannels += 1;
                continue;
            }

            let before = scanBoundaryId;
            try {
                while (true) {
                    const batch = await textChannel.messages.fetch({ limit: 100, before });
                    if (batch.size === 0) break;

                    for (const message of batch.values()) {
                        if (!message.author.bot) {
                            counts.set(message.author.id, (counts.get(message.author.id) || 0) + 1);
                        }
                    }

                    scannedMessages += batch.size;
                    before = batch.last()!.id;
                    if (batch.size < 100) break;
                }
                scannedChannels += 1;
            } catch (error) {
                skippedChannels += 1;
                console.error(`[activity-scan] #${textChannel.name} 수집 실패:`, error);
            }

            await interaction.editReply(
                `과거 메시지를 수집 중입니다…\n채널 ${scannedChannels}/${channels.size}, 메시지 ${scannedMessages.toLocaleString()}개`
            ).catch(() => undefined);
        }

        const finalCounts = await finishHistoricalScan(guild.id, counts);
        scanFinished = true;
        await guild.roles.fetch();
        const members = await guild.members.fetch();
        let changedMembers = 0;

        for (const member of members.values()) {
            if (await syncMemberRank(member, finalCounts.get(member.id) || 0)) {
                changedMembers += 1;
            }
        }

        return interaction.editReply([
            '활동 통계 수집을 완료했습니다.',
            `수집 채널: ${scannedChannels}개`,
            `권한 부족/오류로 건너뜀: ${skippedChannels}개`,
            `확인한 메시지: ${scannedMessages.toLocaleString()}개`,
            `집계된 사용자: ${finalCounts.size.toLocaleString()}명`,
            `역할이 변경된 사용자: ${changedMembers.toLocaleString()}명`,
        ].join('\n'));
    } catch (error) {
        console.error('[activity-scan] 전체 수집 실패:', error);
        return interaction.editReply('활동 통계 수집 중 오류가 발생했습니다. 콘솔 로그를 확인해 주세요.');
    } finally {
        if (!scanFinished) cancelHistoricalScan(guild.id);
    }
}
