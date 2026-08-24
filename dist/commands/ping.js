"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const private_response_1 = require("../utils/private-response");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('ping')
    .setDescription('ping');
async function execute(interaction) {
    return interaction.reply({ content: (0, private_response_1.withPrivateNotice)('pong! 🏓'), ephemeral: true });
}
