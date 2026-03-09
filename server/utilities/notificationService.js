const axios = require('axios');
const User = require('../models/orders/User');
const { normalizePhoneNumber } = require('./paymentLinkUtils');
const { logError } = require('./errorLogger');
const { WHATSAPP_360DIALOG_API_URL, WHATSAPP_360DIALOG_API_KEY } = require('../config/whatsapp360dialog');

const CUSTOMER_CARE_WINDOW_MS = 24 * 60 * 60 * 1000;
const AGREE_TEMPLATE_NAME = 'agree';
const AUTH_TEMPLATE_NAME = 'auth';

const maskApiKey = (value) => {
    const raw = String(value || '').trim();
    if (!raw) {
        return 'missing';
    }
    if (raw.length <= 8) {
        return `${raw.slice(0, 2)}***`;
    }
    return `${raw.slice(0, 4)}***${raw.slice(-4)}`;
};

const logOutgoing = (event, details = {}) => {
    console.log(`[WhatsApp outgoing] ${event}: ${JSON.stringify(details)}`);
};

const safeClone = (value) => {
    try {
        return JSON.parse(JSON.stringify(value));
    } catch (_error) {
        return value;
    }
};

const toDigits = (value) => String(value || '').replace(/\D/g, '');

const normalizeToTenDigits = (value) => {
    const normalized = normalizePhoneNumber(value);
    if (normalized) {
        return normalized;
    }

    const digits = toDigits(value);
    if (digits.length >= 10) {
        return digits.slice(-10);
    }
    return null;
};

const normalizeToWabaPhone = (value) => {
    const digits = toDigits(value);
    if (digits.length === 10) {
        return `7${digits}`;
    }
    if (digits.length === 11 && digits.startsWith('7')) {
        return digits;
    }
    if (digits.length > 11 && digits.startsWith('7')) {
        return digits.slice(0, 11);
    }
    return null;
};

const parsePendingMessages = (rawValue) => {
    if (!rawValue) {
        return [];
    }

    try {
        const parsed = JSON.parse(String(rawValue));
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed
            .map((item) => String(item || '').trim())
            .filter(Boolean);
    } catch (_error) {
        return [];
    }
};

const sendWabaPayload = async (payload) => {
    if (!WHATSAPP_360DIALOG_API_URL || !WHATSAPP_360DIALOG_API_KEY) {
        throw new Error('360dialog config is missing');
    }

    const url = `${WHATSAPP_360DIALOG_API_URL.replace(/\/+$/, '')}/messages`;
    logOutgoing('request', {
        url,
        apiKey: maskApiKey(WHATSAPP_360DIALOG_API_KEY),
        type: payload?.type || null,
        to: payload?.to || null,
        templateName: payload?.template?.name || null,
        textLength: payload?.text?.body ? String(payload.text.body).length : 0,
        payload: safeClone(payload)
    });

    const response = await axios.post(url, payload, {
        headers: {
            'D360-API-KEY': WHATSAPP_360DIALOG_API_KEY,
            'Content-Type': 'application/json'
        },
        timeout: 30000
    });

    logOutgoing('success', {
        type: payload?.type || null,
        to: payload?.to || null,
        templateName: payload?.template?.name || null,
        response: response.data || null
    });

    return response.data;
};

const sendTextDirect = async (toWabaPhone, messageText) => {
    const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toWabaPhone,
        type: 'text',
        text: {
            body: String(messageText || '')
        }
    };

    return sendWabaPayload(payload);
};

const sendTemplateDirect = async (toWabaPhone, templateName, bodyTextParams = []) => {
    const safeParams = Array.isArray(bodyTextParams)
        ? bodyTextParams
            .map((item) => String(item || '').trim())
            .filter(Boolean)
        : [];
    const components = safeParams.length > 0
        ? [
            {
                type: 'body',
                parameters: safeParams.map((text) => ({
                    type: 'text',
                    text
                }))
            }
        ]
        : [];

    const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toWabaPhone,
        type: 'template',
        template: {
            name: String(templateName || '').trim(),
            language: {
                code: 'ru'
            },
            components
        }
    };

    return sendWabaPayload(payload);
};

const ensureUserByPhone = async (tenDigitsPhone) => {
    if (!tenDigitsPhone) {
        return null;
    }

    let user = await User.findOne({ where: { phoneNumber: tenDigitsPhone } });
    if (user) {
        return user;
    }

    try {
        user = await User.create({
            phoneNumber: tenDigitsPhone,
            isPhoneConfirmed: false
        });
        return user;
    } catch (_error) {
        return User.findOne({ where: { phoneNumber: tenDigitsPhone } });
    }
};

const isOutside24hWindow = (userRecord) => {
    const lastIncomingAt = userRecord?.lastIncomingMessageAt ? new Date(userRecord.lastIncomingMessageAt) : null;
    if (!lastIncomingAt) {
        return true;
    }

    return Date.now() - lastIncomingAt.getTime() > CUSTOMER_CARE_WINDOW_MS;
};

const queueMessageAndRequestConsent = async (userRecord, toWabaPhone, messageText) => {
    const pendingMessages = parsePendingMessages(userRecord.pendingWhatsAppMessages);
    pendingMessages.push(String(messageText || '').trim());

    const shouldSendAgree = !userRecord.isWaitingForWhatsappWindowOpen;
    await userRecord.update({
        pendingWhatsAppMessages: JSON.stringify(pendingMessages),
        isWaitingForWhatsappWindowOpen: true,
        lastAgreeTemplateSentAt: shouldSendAgree ? new Date() : userRecord.lastAgreeTemplateSentAt
    });

    if (shouldSendAgree) {
        await sendTemplateDirect(toWabaPhone, AGREE_TEMPLATE_NAME);
    }

    logOutgoing('queued_outside_24h', {
        to: toWabaPhone,
        pendingCount: pendingMessages.length,
        agreeSent: shouldSendAgree
    });

    return {
        queued: true,
        pendingCount: pendingMessages.length,
        agreeSent: shouldSendAgree
    };
};

const sendTextWithPolicy = async (toWabaPhone, tenDigitsPhone, messageText, options = {}) => {
    const text = String(messageText || '').trim();
    if (!toWabaPhone || !text) {
        return null;
    }

    const enforce24h = options.enforce24h !== false;
    if (!enforce24h) {
        return sendTextDirect(toWabaPhone, text);
    }

    const userRecord = await ensureUserByPhone(tenDigitsPhone);
    if (!userRecord) {
        return sendTextDirect(toWabaPhone, text);
    }

    if (isOutside24hWindow(userRecord)) {
        return queueMessageAndRequestConsent(userRecord, toWabaPhone, text);
    }

    return sendTextDirect(toWabaPhone, text);
};

const sendNotification = async (phoneNumber, message, options = {}) => {
    const tenDigitsPhone = normalizeToTenDigits(phoneNumber);
    const toWabaPhone = normalizeToWabaPhone(phoneNumber);

    if (!tenDigitsPhone || !toWabaPhone) {
        logOutgoing('skip_invalid_phone', {
            phoneNumber: String(phoneNumber || ''),
            tenDigitsPhone,
            toWabaPhone
        });
        return null;
    }

    try {
        return await sendTextWithPolicy(toWabaPhone, tenDigitsPhone, message, options);
    } catch (error) {
        logError('notificationService.sendNotification', error, {
            phoneNumber: tenDigitsPhone,
            toWabaPhone
        });
        return null;
    }
};

const sendToChatId = async (chatId, message, options = {}) => {
    const tenDigitsPhone = normalizeToTenDigits(chatId);
    if (!tenDigitsPhone) {
        logOutgoing('skip_invalid_chat_id', {
            chatId: String(chatId || '')
        });
        return null;
    }

    return sendNotification(tenDigitsPhone, message, options);
};

const sendAuthTemplate = async (phoneNumber, code) => {
    const toWabaPhone = normalizeToWabaPhone(phoneNumber);
    const safeCode = String(code || '').replace(/\D/g, '').slice(0, 6);

    if (!toWabaPhone || safeCode.length !== 6) {
        logOutgoing('skip_invalid_auth_payload', {
            phoneNumber: String(phoneNumber || ''),
            codeLength: safeCode.length
        });
        return null;
    }

    try {
        return await sendTemplateDirect(toWabaPhone, AUTH_TEMPLATE_NAME, [safeCode]);
    } catch (error) {
        logError('notificationService.sendAuthTemplate', error, {
            phoneNumber: normalizeToTenDigits(phoneNumber),
            toWabaPhone
        });
        return null;
    }
};

const flushPendingMessagesByPhone = async (phoneNumber) => {
    const tenDigitsPhone = normalizeToTenDigits(phoneNumber);
    const toWabaPhone = normalizeToWabaPhone(phoneNumber);
    if (!tenDigitsPhone || !toWabaPhone) {
        logOutgoing('flush_skip_invalid_phone', {
            phoneNumber: String(phoneNumber || '')
        });
        return {
            sentCount: 0,
            pendingCount: 0
        };
    }

    const userRecord = await User.findOne({ where: { phoneNumber: tenDigitsPhone } });
    if (!userRecord) {
        logOutgoing('flush_skip_no_user', {
            phoneNumber: tenDigitsPhone
        });
        return {
            sentCount: 0,
            pendingCount: 0
        };
    }

    const pendingMessages = parsePendingMessages(userRecord.pendingWhatsAppMessages);
    if (pendingMessages.length === 0) {
        if (userRecord.isWaitingForWhatsappWindowOpen) {
            await userRecord.update({
                isWaitingForWhatsappWindowOpen: false
            });
        }

        logOutgoing('flush_no_pending', {
            phoneNumber: tenDigitsPhone
        });
        return {
            sentCount: 0,
            pendingCount: 0
        };
    }

    let sentCount = 0;
    const unsentMessages = [];

    for (let index = 0; index < pendingMessages.length; index += 1) {
        const currentMessage = pendingMessages[index];
        try {
            await sendTextDirect(toWabaPhone, currentMessage);
            sentCount += 1;
        } catch (error) {
            unsentMessages.push(currentMessage, ...pendingMessages.slice(index + 1));
            logError('notificationService.flushPendingMessagesByPhone', error, {
                phoneNumber: tenDigitsPhone,
                sentCount
            });
            logOutgoing('flush_failed', {
                phoneNumber: tenDigitsPhone,
                sentCount,
                pendingCount: pendingMessages.length - sentCount
            });
            break;
        }
    }

    await userRecord.update({
        pendingWhatsAppMessages: unsentMessages.length > 0 ? JSON.stringify(unsentMessages) : null,
        isWaitingForWhatsappWindowOpen: unsentMessages.length > 0
    });

    logOutgoing('flush_done', {
        phoneNumber: tenDigitsPhone,
        sentCount,
        pendingCount: unsentMessages.length
    });

    return {
        sentCount,
        pendingCount: unsentMessages.length
    };
};

const flushPendingMessagesByChatId = async (chatId) => flushPendingMessagesByPhone(chatId);

module.exports = sendNotification;
module.exports.sendToChatId = sendToChatId;
module.exports.sendAuthTemplate = sendAuthTemplate;
module.exports.flushPendingMessagesByPhone = flushPendingMessagesByPhone;
module.exports.flushPendingMessagesByChatId = flushPendingMessagesByChatId;
