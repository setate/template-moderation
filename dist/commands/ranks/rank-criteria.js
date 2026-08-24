"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const ranking_1 = require("../../services/ranking");
const private_response_1 = require("../../utils/private-response");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('rank-criteria')
    .setNameLocalizations({ ko: '등급기준' })
    .setDescription('Show the automatic activity rank requirements')
    .setDescriptionLocalizations({ ko: '자동 활동 등급의 승급 기준을 확인합니다' });
async function execute(interaction) {
    const criteria = ranking_1.RANKS.map(rank => {
        if (rank.minDays === 0 && rank.minMessages === 0) {
            return `**${rank.name}** — 서버 입장 시 자동 부여`;
        }
        return `**${rank.name}** — 체류 **${rank.minDays.toLocaleString()}일 이상** + 메시지 **${rank.minMessages.toLocaleString()}개 이상**`;
    });
    return interaction.reply({
        content: (0, private_response_1.withPrivateNotice)([
            '## 🎓 자동 등급 기준',
            ...criteria,
        ].join('\n')),
        ephemeral: true,
    });
}
