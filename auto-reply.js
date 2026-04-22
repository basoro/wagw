const axios = require('axios');
require('dotenv').config();

const AUTO_REPLY_WEBHOOK_URL = process.env.AUTO_REPLY_WEBHOOK_URL || '';
const configuredTimeout = Number.parseInt(process.env.AUTO_REPLY_TIMEOUT_MS || '10000', 10);
const AUTO_REPLY_TIMEOUT_MS = Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 10000;
const AUTO_REPLY_FALLBACK_MESSAGE = process.env.AUTO_REPLY_FALLBACK_MESSAGE || '';

const unwrapMessage = (msg = {}) => {
    let content = msg.message;
    while (content) {
        if (content.ephemeralMessage?.message) {
            content = content.ephemeralMessage.message;
            continue;
        }
        if (content.viewOnceMessage?.message) {
            content = content.viewOnceMessage.message;
            continue;
        }
        if (content.viewOnceMessageV2?.message) {
            content = content.viewOnceMessageV2.message;
            continue;
        }
        if (content.documentWithCaptionMessage?.message) {
            content = content.documentWithCaptionMessage.message;
            continue;
        }
        break;
    }

    return content || {};
};

const extractIncomingText = (msg = {}) => {
    const message = unwrapMessage(msg);
    return (
        message.conversation ||
        message.extendedTextMessage?.text ||
        message.imageMessage?.caption ||
        message.videoMessage?.caption ||
        ''
    ).trim();
};

const isIncomingChatMessage = (msg = {}) => {
    const remoteJid = msg?.key?.remoteJid || '';
    if (!remoteJid) return false;
    if (msg?.key?.fromMe) return false;
    if (remoteJid === 'status@broadcast') return false;
    if (remoteJid.endsWith('@broadcast')) return false;
    if (remoteJid.endsWith('@g.us')) return false;
    return true;
};

const normalizeReply = (data) => {
    if (!data) return '';
    if (typeof data === 'string') return data.trim();
    if (typeof data === 'object') {
        const candidate = data.reply || data.message || data.text;
        if (typeof candidate === 'string') return candidate.trim();
    }
    return '';
};

const requestAutoReply = async (payload) => {
    if (!AUTO_REPLY_WEBHOOK_URL) {
        return AUTO_REPLY_FALLBACK_MESSAGE || '';
    }

    try {
        const response = await axios.post(AUTO_REPLY_WEBHOOK_URL, payload, {
            timeout: AUTO_REPLY_TIMEOUT_MS
        });
        const autoReply = normalizeReply(response.data);
        return autoReply || AUTO_REPLY_FALLBACK_MESSAGE || '';
    } catch (error) {
        console.log(`Auto reply webhook error [${AUTO_REPLY_WEBHOOK_URL}]:`, error.stack || error.message);
        return AUTO_REPLY_FALLBACK_MESSAGE || '';
    }
};

module.exports = {
    extractIncomingText,
    isIncomingChatMessage,
    requestAutoReply
};
