"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRIVATE_RESPONSE_FLAGS = exports.PRIVATE_RESPONSE_NOTICE = void 0;
exports.withPrivateNotice = withPrivateNotice;
const discord_js_1 = require("discord.js");
exports.PRIVATE_RESPONSE_NOTICE = '🔒 이 메시지는 본인에게만 표시됩니다.';
exports.PRIVATE_RESPONSE_FLAGS = discord_js_1.MessageFlags.Ephemeral;
function withPrivateNotice(content) {
    return `${content}\n\n${exports.PRIVATE_RESPONSE_NOTICE}`;
}
