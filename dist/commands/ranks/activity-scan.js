"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const activity_1 = require("../../services/activity");
const ranking_1 = require("../../services/ranking");
const private_response_1 = require("../../utils/private-response");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('activity-scan')
    .setNameLocalizations({ ko: '활동통계수집' })
    .setDescription('Scan all accessible message history and recalculate activity ranks')
    .setDescriptionLocalizations({ ko: '접근 가능한 과거 메시지를 전부 집계하고 활동 등급을 다시 계산합니다' })
    .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageGuild);
async function execute(interaction) {
    if (!interaction.guild) {
        return interaction.reply({ content: (0, private_response_1.withPrivateNotice)('서버에서만 사용할 수 있습니다.'), ephemeral: true });
    }
    const guild = interaction.guild;
    if ((0, activity_1.isHistoricalScanActive)(guild.id)) {
        return interaction.reply({ content: (0, private_response_1.withPrivateNotice)('이 서버의 활동 통계를 이미 수집 중입니다.'), ephemeral: true });
    }
    await interaction.deferReply({ ephemeral: true });
    (0, activity_1.beginHistoricalScan)(guild.id);
    const scanBoundaryId = discord_js_1.SnowflakeUtil.generate({ timestamp: Date.now() }).toString();
    const counts = new Map();
    let scannedMessages = 0;
    let scannedChannels = 0;
    let skippedChannels = 0;
    let scanFinished = false;
    try {
        await guild.channels.fetch();
        const me = guild.members.me || await guild.members.fetchMe();
        const scannableTypes = new Set([
            discord_js_1.ChannelType.GuildText,
            discord_js_1.ChannelType.GuildAnnouncement,
            discord_js_1.ChannelType.PublicThread,
            discord_js_1.ChannelType.PrivateThread,
            discord_js_1.ChannelType.AnnouncementThread,
        ]);
        const channels = guild.channels.cache
            .filter(channel => scannableTypes.has(channel.type))
            .sort((a, b) => a.id.localeCompare(b.id));
        for (const channel of channels.values()) {
            const textChannel = channel;
            const permissions = textChannel.permissionsFor(me);
            if (!permissions?.has(discord_js_1.PermissionFlagsBits.ViewChannel) ||
                !permissions.has(discord_js_1.PermissionFlagsBits.ReadMessageHistory)) {
                skippedChannels += 1;
                continue;
            }
            let before = scanBoundaryId;
            try {
                while (true) {
                    const batch = await textChannel.messages.fetch({ limit: 100, before });
                    if (batch.size === 0)
                        break;
                    for (const message of batch.values()) {
                        if (!message.author.bot) {
                            counts.set(message.author.id, (counts.get(message.author.id) || 0) + 1);
                        }
                    }
                    scannedMessages += batch.size;
                    before = batch.last().id;
                    if (batch.size < 100)
                        break;
                }
                scannedChannels += 1;
            }
            catch (error) {
                skippedChannels += 1;
                console.error(`[activity-scan] #${textChannel.name} 수집 실패:`, error);
            }
            await interaction.editReply((0, private_response_1.withPrivateNotice)(`과거 메시지를 수집 중입니다…\n채널 ${scannedChannels}/${channels.size}, 메시지 ${scannedMessages.toLocaleString()}개`)).catch(() => undefined);
        }
        const finalCounts = await (0, activity_1.finishHistoricalScan)(guild.id, counts);
        scanFinished = true;
        await guild.roles.fetch();
        const members = await guild.members.fetch();
        let changedMembers = 0;
        let failedRoleChanges = 0;
        for (const member of members.values()) {
            try {
                if (await (0, ranking_1.syncMemberRank)(member, finalCounts.get(member.id) || 0)) {
                    changedMembers += 1;
                }
            }
            catch (error) {
                failedRoleChanges += 1;
                console.error(`[activity-scan] ${member.user.tag} 역할 변경 실패:`, error);
            }
        }
        return interaction.editReply((0, private_response_1.withPrivateNotice)([
            '활동 통계 수집을 완료했습니다.',
            `수집 채널: ${scannedChannels}개`,
            `권한 부족/오류로 건너뜀: ${skippedChannels}개`,
            `확인한 메시지: ${scannedMessages.toLocaleString()}개`,
            `집계된 사용자: ${finalCounts.size.toLocaleString()}명`,
            `역할이 변경된 사용자: ${changedMembers.toLocaleString()}명`,
            `권한/역할 순서 문제로 변경 실패: ${failedRoleChanges.toLocaleString()}명`,
        ].join('\n')));
    }
    catch (error) {
        console.error('[activity-scan] 전체 수집 실패:', error);
        const message = error instanceof Error ? error.message : String(error);
        return interaction.editReply((0, private_response_1.withPrivateNotice)(`활동 통계 수집 중 오류가 발생했습니다: ${message.slice(0, 500)}`));
    }
    finally {
        if (!scanFinished)
            (0, activity_1.cancelHistoricalScan)(guild.id);
    }
}
