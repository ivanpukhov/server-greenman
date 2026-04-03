const axios = require('axios');
const FormData = require('form-data');
const {
    GREEN_API_URL,
    GREEN_API_MEDIA_URL,
    GREEN_API_ID_INSTANCE,
    GREEN_API_TOKEN_INSTANCE
} = require('../config/greenApi');

const ensureConfig = () => {
    if (!GREEN_API_URL || !GREEN_API_MEDIA_URL || !GREEN_API_ID_INSTANCE || !GREEN_API_TOKEN_INSTANCE) {
        throw new Error('Green API config is missing');
    }
};

const buildApiUrl = (methodName) => {
    ensureConfig();
    return `${GREEN_API_URL.replace(/\/+$/, '')}/waInstance${GREEN_API_ID_INSTANCE}/${methodName}/${GREEN_API_TOKEN_INSTANCE}`;
};

const buildMediaUrl = (methodName) => {
    ensureConfig();
    return `${GREEN_API_MEDIA_URL.replace(/\/+$/, '')}/waInstance${GREEN_API_ID_INSTANCE}/${methodName}/${GREEN_API_TOKEN_INSTANCE}`;
};

const normalizePhoneToChatId = (value) => {
    const raw = String(value || '').trim();
    if (!raw) {
        return null;
    }

    if (/@(?:c\.us|g\.us|s\.whatsapp\.net|broadcast|newsletter|lid)$/i.test(raw)) {
        if (raw.endsWith('@s.whatsapp.net')) {
            return `${raw.slice(0, -'@s.whatsapp.net'.length)}@c.us`;
        }
        return raw;
    }

    const digits = raw.replace(/\D/g, '');
    if (!digits) {
        return null;
    }

    const normalizedDigits = digits.length === 10
        ? `7${digits}`
        : digits.length > 11
            ? digits.slice(0, 11)
            : digits;

    return normalizedDigits ? `${normalizedDigits}@c.us` : null;
};

const postJson = async (methodName, payload, options = {}) => {
    const response = await axios.post(buildApiUrl(methodName), payload, {
        timeout: options.timeout || 30000,
        headers: {
            'Content-Type': 'application/json'
        }
    });
    return response.data;
};

const getJson = async (methodName, options = {}) => {
    const response = await axios.get(buildApiUrl(methodName), {
        timeout: options.timeout || 30000
    });
    return response.data;
};

const sendMessage = async ({ chatId, message, quotedMessageId = null, linkPreview = true }) => {
    const normalizedChatId = normalizePhoneToChatId(chatId);
    const text = String(message || '').trim();
    if (!normalizedChatId || !text) {
        return null;
    }

    const payload = {
        chatId: normalizedChatId,
        message: text,
        linkPreview: Boolean(linkPreview)
    };

    if (quotedMessageId) {
        payload.quotedMessageId = String(quotedMessageId).trim();
    }

    return postJson('sendMessage', payload);
};

const sendFileByUrl = async ({ chatId, urlFile, fileName, caption = '', quotedMessageId = null }) => {
    const normalizedChatId = normalizePhoneToChatId(chatId);
    const safeUrl = String(urlFile || '').trim();
    if (!normalizedChatId || !safeUrl) {
        return null;
    }

    const payload = {
        chatId: normalizedChatId,
        urlFile: safeUrl,
        fileName: String(fileName || `file-${Date.now()}`).trim(),
        caption: String(caption || '')
    };

    if (quotedMessageId) {
        payload.quotedMessageId = String(quotedMessageId).trim();
    }

    return postJson('sendFileByUrl', payload, { timeout: 60000 });
};

const sendFileByUpload = async ({ chatId, fileBuffer, fileName, mimeType, caption = '' }) => {
    const normalizedChatId = normalizePhoneToChatId(chatId);
    if (!normalizedChatId || !Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
        return null;
    }

    const form = new FormData();
    form.append('chatId', normalizedChatId);
    form.append('file', fileBuffer, {
        filename: String(fileName || `file-${Date.now()}`).trim(),
        contentType: String(mimeType || 'application/octet-stream').trim()
    });

    const normalizedCaption = String(caption || '').trim();
    if (normalizedCaption) {
        form.append('caption', normalizedCaption);
    }

    const response = await axios.post(buildMediaUrl('sendFileByUpload'), form, {
        timeout: 120000,
        maxBodyLength: Infinity,
        headers: form.getHeaders()
    });

    return response.data;
};

const deleteMessage = async ({ chatId, idMessage }) => {
    const normalizedChatId = normalizePhoneToChatId(chatId);
    const messageId = String(idMessage || '').trim();
    if (!normalizedChatId || !messageId) {
        return null;
    }

    return postJson('deleteMessage', {
        chatId: normalizedChatId,
        idMessage: messageId
    });
};

const getStateInstance = async () => getJson('getStateInstance');
const getSettings = async () => getJson('getSettings');
const setSettings = async (settings) => postJson('setSettings', settings);
const reboot = async () => getJson('reboot');
const logout = async () => getJson('logout');
const getQr = async () => getJson('qr');

module.exports = {
    GREEN_API_URL,
    GREEN_API_MEDIA_URL,
    GREEN_API_ID_INSTANCE,
    GREEN_API_TOKEN_INSTANCE,
    normalizePhoneToChatId,
    sendMessage,
    sendFileByUrl,
    sendFileByUpload,
    deleteMessage,
    getStateInstance,
    getSettings,
    setSettings,
    reboot,
    logout,
    getQr
};
