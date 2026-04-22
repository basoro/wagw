const axios = require('axios');
require('dotenv').config();

const AUTO_REPLY_WEBHOOK_URL = process.env.AUTO_REPLY_WEBHOOK_URL || '';
const DEFAULT_TIMEOUT_MS = 10000;
const configuredTimeoutMs = Number.parseInt(process.env.AUTO_REPLY_TIMEOUT_MS || String(DEFAULT_TIMEOUT_MS), 10);
const AUTO_REPLY_TIMEOUT_MS = Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs > 0 ? configuredTimeoutMs : DEFAULT_TIMEOUT_MS;
const AUTO_REPLY_FALLBACK_MESSAGE = process.env.AUTO_REPLY_FALLBACK_MESSAGE || '';

// Per-device auto-reply state.
// Devices are enabled by default when a webhook URL is configured.
// An explicit disable call adds the device to this set.
const disabledDevices = new Set();
// Track devices that have been explicitly enabled (overrides default-off when no webhook URL).
const enabledDevices = new Set();

const isAutoReplyEnabled = (device) => {
    if (disabledDevices.has(device)) return false;
    if (enabledDevices.has(device)) return true;
    // Default: enabled only when a global webhook URL is set
    return Boolean(AUTO_REPLY_WEBHOOK_URL);
};

const enableAutoReply = (device) => {
    enabledDevices.add(device);
    disabledDevices.delete(device);
};

const disableAutoReply = (device) => {
    disabledDevices.add(device);
    enabledDevices.delete(device);
};

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
    // Auto-reply is intentionally limited to personal (1-on-1) chats.
    // Group chats are excluded to avoid flooding group conversations with bot replies.
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

    // Redact credentials from URL before logging
    let safeUrl = AUTO_REPLY_WEBHOOK_URL;
    try {
        const parsed = new URL(AUTO_REPLY_WEBHOOK_URL);
        parsed.username = parsed.username ? '***' : '';
        parsed.password = parsed.password ? '***' : '';
        safeUrl = parsed.toString();
    } catch (_) { /* not a valid URL, use as-is */ }

    try {
        const response = await axios.post(AUTO_REPLY_WEBHOOK_URL, payload, {
            timeout: AUTO_REPLY_TIMEOUT_MS
        });
        const autoReply = normalizeReply(response.data);
        return autoReply || AUTO_REPLY_FALLBACK_MESSAGE || '';
    } catch (error) {
        const errorDetail = error.code
            ? `network error: ${error.code}`
            : `HTTP ${error.response?.status || 'unknown'}`;
        console.log(`Auto-reply webhook request failed [${safeUrl}] (${errorDetail}):`, error.stack || error.message);
        return AUTO_REPLY_FALLBACK_MESSAGE || '';
    }
};

module.exports = {
    extractIncomingText,
    isIncomingChatMessage,
    requestAutoReply,
    isAutoReplyEnabled,
    enableAutoReply,
    disableAutoReply
};
