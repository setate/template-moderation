import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
} from 'discord.js';
import { RANKS } from '../../services/ranking';
import { PRIVATE_RESPONSE_FLAGS, withPrivateNotice } from '../../utils/private-response';

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
        ].join('\n')),
        flags: PRIVATE_RESPONSE_FLAGS,
    });
}
