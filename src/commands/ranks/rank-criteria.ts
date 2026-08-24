import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
} from 'discord.js';
import { RANKS } from '../../services/ranking';
import { withPrivateNotice } from '../../utils/private-response';

export const data = new SlashCommandBuilder()
    .setName('rank-criteria')
    .setNameLocalizations({ ko: '등급기준' })
    .setDescription('Show the automatic activity rank requirements')
    .setDescriptionLocalizations({ ko: '자동 활동 등급의 승급 기준을 확인합니다' });

export async function execute(interaction: ChatInputCommandInteraction) {
    const criteria = RANKS.map(rank => {
        if (rank.minDays === 0 && rank.minMessages === 0) {
            return `**${rank.name}** — 서버 입장 시 자동 부여`;
        }

        return `**${rank.name}** — 체류 **${rank.minDays.toLocaleString()}일 이상** + 메시지 **${rank.minMessages.toLocaleString()}개 이상**`;
    });

    return interaction.reply({
        content: withPrivateNotice([
            '## 🎓 자동 등급 기준',
            ...criteria,
            '',
            '체류기간과 메시지 수를 **모두 충족**해야 다음 등급으로 올라갑니다.',
            '메시지는 봇이 읽을 수 있는 서버 채널에서 작성한 내용만 집계됩니다.',
        ].join('\n')),
        ephemeral: true,
    });
}
