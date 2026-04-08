const axios = require('axios');
const FormData = require('form-data');
const path = require('path');
const { D360_API_BASE_URL, D360_API_KEY } = require('../config/dialog360');

const ensureConfig = () => {
    if (!D360_API_BASE_URL || !D360_API_KEY) {
        throw new Error('360dialog config is missing');
    }
};

const toDigits = (value) => String(value || '').replace(/\D/g, '');

const buildApiUrl = (pathname = '') => {
    ensureConfig();
    const base = D360_API_BASE_URL.replace(/\/+$/, '');
    const suffix = String(pathname || '').replace(/^\/+/, '');
    return suffix ? `${base}/${suffix}` : base;
};

const getHeaders = (headers = {}) => ({
    'D360-API-KEY': D360_API_KEY,
    ...headers
});

const normalizePhoneToWaId = (value) => {
    const raw = String(value || '').trim();
    if (!raw) {
        return null;
    }

    if (/@(?:c\.us|g\.us|s\.whatsapp\.net|broadcast|newsletter|lid)$/i.test(raw)) {
        return toDigits(raw);
    }

    const digits = toDigits(raw);
    if (!digits) {
        return null;
    }

    if (digits.length === 10) {
        return `7${digits}`;
    }

    if (digits.length >= 11) {
        return digits.slice(-11);
    }

    return digits;
};

const normalizePhoneToChatId = (value) => {
    const waId = normalizePhoneToWaId(value);
    return waId ? `${waId}@c.us` : null;
};

const normalizeMediaType = ({ mimeType, fileName, urlFile }) => {
    const safeMimeType = String(mimeType || '').trim().toLowerCase();
    const ext = path.extname(String(fileName || urlFile || '').trim()).toLowerCase();

    if (safeMimeType.startsWith('video/') || ['.mp4', '.3gp'].includes(ext)) {
        return 'video';
    }

    if (safeMimeType.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
        return 'image';
    }

    if (safeMimeType.startsWith('audio/') || ['.aac', '.amr', '.mp3', '.m4a', '.ogg', '.oga', '.opus', '.wav'].includes(ext)) {
        return 'audio';
    }

    return 'document';
};

const supportsCaptionForMediaType = (type) => ['image', 'video', 'document'].includes(String(type || '').trim());

const isVoiceMedia = ({ mimeType, fileName, urlFile, voice = false }) => {
    if (voice === true) {
        return true;
    }

    const safeMimeType = String(mimeType || '').trim().toLowerCase();
    const ext = path.extname(String(fileName || urlFile || '').trim()).toLowerCase();
    return safeMimeType === 'audio/ogg' || safeMimeType === 'audio/opus' || ['.ogg', '.oga', '.opus'].includes(ext);
};

const buildProviderResponse = (data) => ({
    ...data,
    idMessage: String(data?.messages?.[0]?.id || '').trim() || null
});

const postJson = async (pathname, payload, options = {}) => {
    const response = await axios.post(buildApiUrl(pathname), payload, {
        timeout: options.timeout || 30000,
        headers: getHeaders({
            'Content-Type': 'application/json',
            ...(options.headers || {})
        })
    });

    return buildProviderResponse(response.data || {});
};

const getJson = async (pathname, options = {}) => {
    const response = await axios.get(buildApiUrl(pathname), {
        timeout: options.timeout || 30000,
        headers: getHeaders(options.headers || {})
    });
    return response.data;
};

const normalizeDownloadUrl = (mediaUrl) => {
    const rawUrl = String(mediaUrl || '').trim();
    if (!rawUrl) {
        return null;
    }

    try {
        const parsed = new URL(rawUrl);
        return `${buildApiUrl().replace(/\/+$/, '')}${parsed.pathname}${parsed.search}`;
    } catch (_error) {
        return rawUrl;
    }
};

const sendMessage = async ({ chatId, message, quotedMessageId = null, linkPreview = true }) => {
    const to = normalizePhoneToWaId(chatId);
    const body = String(message || '').trim();
    if (!to || !body) {
        return null;
    }

    const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: {
            body,
            preview_url: Boolean(linkPreview)
        }
    };

    if (quotedMessageId) {
        payload.context = {
            message_id: String(quotedMessageId).trim()
        };
    }

    return postJson('messages', payload);
};

const sendTemplate = async ({ chatId, templateName, languageCode = 'ru', components = [] }) => {
    const to = normalizePhoneToWaId(chatId);
    const name = String(templateName || '').trim();
    const code = String(languageCode || '').trim();
    if (!to || !name || !code) {
        return null;
    }

    const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'template',
        template: {
            name,
            language: {
                code
            }
        }
    };

    if (Array.isArray(components) && components.length > 0) {
        payload.template.components = components;
    }

    return postJson('messages', payload);
};

const sendInteractiveButtonsReply = async ({ chatId, header = '', body, footer = '', buttons = [] }) => {
    const to = normalizePhoneToWaId(chatId);
    const bodyText = String(body || '').trim();
    const normalizedButtons = Array.isArray(buttons)
        ? buttons
            .map((button) => ({
                type: 'reply',
                reply: {
                    id: String(button?.buttonId || '').trim(),
                    title: String(button?.buttonText || '').trim().slice(0, 20)
                }
            }))
            .filter((button) => button.reply.id && button.reply.title)
            .slice(0, 3)
        : [];

    if (!to || !bodyText || normalizedButtons.length === 0) {
        return null;
    }

    const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
            type: 'button',
            body: {
                text: bodyText
            },
            action: {
                buttons: normalizedButtons
            }
        }
    };

    const headerText = String(header || '').trim();
    const footerText = String(footer || '').trim();

    if (headerText) {
        payload.interactive.header = {
            type: 'text',
            text: headerText
        };
    }

    if (footerText) {
        payload.interactive.footer = {
            text: footerText
        };
    }

    return postJson('messages', payload);
};

const sendMediaByObject = async ({ chatId, type, mediaObject, context = null }) => {
    const to = normalizePhoneToWaId(chatId);
    if (!to || !type || !mediaObject) {
        return null;
    }

    const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type,
        [type]: mediaObject
    };

    if (context?.message_id) {
        payload.context = context;
    }

    return postJson('messages', payload, { timeout: 120000 });
};

const sendFileByUrl = async ({ chatId, urlFile, fileName, mimeType, caption = '', quotedMessageId = null, voice = false }) => {
    const safeUrl = String(urlFile || '').trim();
    if (!safeUrl) {
        return null;
    }

    const type = normalizeMediaType({ mimeType, fileName, urlFile: safeUrl });
    const safeFileName = String(fileName || `file-${Date.now()}`).trim();
    const safeCaption = String(caption || '').trim();
    const mediaObject = {
        link: safeUrl
    };

    if (type === 'document') {
        mediaObject.filename = safeFileName;
        if (safeCaption) {
            mediaObject.caption = safeCaption;
        }
    } else if (type === 'image' || type === 'video') {
        if (safeCaption) {
            mediaObject.caption = safeCaption;
        }
    } else if (type === 'audio' && isVoiceMedia({ mimeType, fileName: safeFileName, urlFile: safeUrl, voice })) {
        mediaObject.voice = true;
    }

    return sendMediaByObject({
        chatId,
        type,
        mediaObject,
        context: quotedMessageId
            ? {
                message_id: String(quotedMessageId).trim()
            }
            : null
    });
};

const uploadMedia = async ({ fileBuffer, fileName, mimeType }) => {
    if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
        return null;
    }

    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('file', fileBuffer, {
        filename: String(fileName || `file-${Date.now()}`).trim(),
        contentType: String(mimeType || 'application/octet-stream').trim()
    });

    const response = await axios.post(buildApiUrl('media'), form, {
        timeout: 120000,
        maxBodyLength: Infinity,
        headers: getHeaders(form.getHeaders())
    });

    return response.data || null;
};

const sendFileByUpload = async ({ chatId, fileBuffer, fileName, mimeType, caption = '', quotedMessageId = null, voice = false }) => {
    const uploadResponse = await uploadMedia({
        fileBuffer,
        fileName,
        mimeType
    });

    const mediaId = String(uploadResponse?.id || '').trim();
    if (!mediaId) {
        return null;
    }

    const type = normalizeMediaType({ mimeType, fileName });
    const safeFileName = String(fileName || `file-${Date.now()}`).trim();
    const safeCaption = String(caption || '').trim();
    const mediaObject = {
        id: mediaId
    };

    if (type === 'document') {
        mediaObject.filename = safeFileName;
        if (safeCaption) {
            mediaObject.caption = safeCaption;
        }
    } else if (type === 'image' || type === 'video') {
        if (safeCaption) {
            mediaObject.caption = safeCaption;
        }
    } else if (type === 'audio' && isVoiceMedia({ mimeType, fileName: safeFileName, voice })) {
        mediaObject.voice = true;
    }

    return sendMediaByObject({
        chatId,
        type,
        mediaObject,
        context: quotedMessageId
            ? {
                message_id: String(quotedMessageId).trim()
            }
            : null
    });
};

const deleteMessage = async ({ chatId, idMessage }) => ({
    ok: false,
    unsupported: true,
    chatId: normalizePhoneToChatId(chatId),
    messageId: String(idMessage || '').trim() || null
});

const getMediaInfo = async (mediaId) => {
    const id = String(mediaId || '').trim();
    if (!id) {
        return null;
    }

    return getJson(id);
};

const getMediaDownloadUrl = async (mediaId) => {
    const mediaInfo = await getMediaInfo(mediaId);
    return normalizeDownloadUrl(mediaInfo?.url || '');
};

const downloadMediaBuffer = async (mediaUrl, options = {}) => {
    const normalizedUrl = normalizeDownloadUrl(mediaUrl);
    if (!normalizedUrl) {
        return null;
    }

    const response = await axios.get(normalizedUrl, {
        responseType: 'arraybuffer',
        timeout: options.timeout || 120000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        headers: getHeaders(options.headers || {})
    });

    const buffer = Buffer.from(response.data || []);
    return {
        buffer,
        mimeType: String(response.headers?.['content-type'] || '').trim()
    };
};

const getWebhook = async () => getJson('v1/configs/webhook');

const setWebhook = async ({ url, headers = null }) => {
    const body = {
        url: String(url || '').trim()
    };

    if (headers && typeof headers === 'object' && Object.keys(headers).length > 0) {
        body.headers = headers;
    }

    return postJson('v1/configs/webhook', body);
};

module.exports = {
    D360_API_BASE_URL,
    D360_API_KEY,
    normalizePhoneToWaId,
    normalizePhoneToChatId,
    normalizeMediaType,
    supportsCaptionForMediaType,
    isVoiceMedia,
    normalizeDownloadUrl,
    sendMessage,
    sendTemplate,
    sendInteractiveButtonsReply,
    sendFileByUrl,
    sendFileByUpload,
    deleteMessage,
    getMediaInfo,
    getMediaDownloadUrl,
    downloadMediaBuffer,
    getWebhook,
    setWebhook
};
