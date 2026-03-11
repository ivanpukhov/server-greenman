const axios = require('axios');
const User = require('../models/orders/User');
const AdminUser = require('../models/orders/AdminUser');
const { normalizePhoneNumber } = require('./paymentLinkUtils');
const { logError } = require('./errorLogger');
const { WHATSAPP_360DIALOG_API_URL, WHATSAPP_360DIALOG_API_KEY } = require('../config/whatsapp360dialog');

const CUSTOMER_CARE_WINDOW_MS = 24 * 60 * 60 * 1000;
const AGREE_TEMPLATE_NAME = 'agree';
const AUTH_TEMPLATE_NAME = 'auth';
const IVAN_ADMIN_PHONE = '7073670497';
const AGREE_TOGGLE_CACHE_TTL_MS = 30 * 1000;
let agreeTemplateEnabledCache = {
    value: true,
    expiresAt: 0
};

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

const extractOutgoingTextPreview = (payload) => {
    const type = String(payload?.type || '').trim();
    if (type === 'text') {
        return String(payload?.text?.body || '').trim() || null;
    }

    if (type === 'template') {
        const templateName = String(payload?.template?.name || '').trim();
        const components = Array.isArray(payload?.template?.components) ? payload.template.components : [];
        const params = [];
        for (const component of components) {
            const parameters = Array.isArray(component?.parameters) ? component.parameters : [];
            for (const parameter of parameters) {
                if (parameter?.type === 'text' && String(parameter?.text || '').trim()) {
                    params.push(String(parameter.text).trim());
                }
            }
        }
        const paramsText = params.length > 0 ? ` params=[${params.join(' | ')}]` : '';
        return `${templateName || 'template'}${paramsText}`;
    }

    return null;
};

const safeClone = (value) => {
    try {
        return JSON.parse(JSON.stringify(value));
    } catch (_error) {
        return value;
    }
};

const toDigits = (value) => String(value || '').replace(/\D/g, '');
const toText = (value) => String(value || '').trim();
const isPhoneLikeWaJid = (value) => {
    const raw = toText(value).toLowerCase();
    if (!raw.includes('@')) {
        return true;
    }
    return raw.endsWith('@c.us') || raw.endsWith('@s.whatsapp.net') || raw.endsWith('@hosted');
};

const normalizeToTenDigits = (value) => {
    if (!isPhoneLikeWaJid(value)) {
        return null;
    }

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
    if (!isPhoneLikeWaJid(value)) {
        return null;
    }

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

const getAgreeTemplateEnabled = async () => {
    const now = Date.now();
    if (agreeTemplateEnabledCache.expiresAt > now) {
        return agreeTemplateEnabledCache.value;
    }

    try {
        const ivanAdmin = await AdminUser.findOne({
            where: {
                phoneNumber: IVAN_ADMIN_PHONE,
                isActive: true
            },
            attributes: ['whatsappAgreeTemplateEnabled']
        });

        const value = ivanAdmin && typeof ivanAdmin.whatsappAgreeTemplateEnabled === 'boolean'
            ? Boolean(ivanAdmin.whatsappAgreeTemplateEnabled)
            : true;

        agreeTemplateEnabledCache = {
            value,
            expiresAt: now + AGREE_TOGGLE_CACHE_TTL_MS
        };
        return value;
    } catch (_error) {
        agreeTemplateEnabledCache = {
            value: true,
            expiresAt: now + 5000
        };
        return true;
    }
};

const sendWabaPayload = async (payload) => {
    if (!WHATSAPP_360DIALOG_API_URL || !WHATSAPP_360DIALOG_API_KEY) {
        throw new Error('360dialog config is missing');
    }

    const url = `${WHATSAPP_360DIALOG_API_URL.replace(/\/+$/, '')}/messages`;
    const outgoingTextPreview = extractOutgoingTextPreview(payload);
    if (outgoingTextPreview) {
        console.log(
            `[WhatsApp outgoing][api-send] to=${String(payload?.to || '').trim() || 'unknown'} type=${String(payload?.type || '').trim() || 'unknown'} text=${outgoingTextPreview}`
        );
    }
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

    const isAgreeTemplateEnabled = await getAgreeTemplateEnabled();
    if (!isAgreeTemplateEnabled) {
        logOutgoing('agree_template_disabled_direct_send', {
            to: toWabaPhone
        });
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
        const payload = {
            messaging_product: 'whatsapp',
            to: toWabaPhone,
            type: 'template',
            template: {
                name: AUTH_TEMPLATE_NAME,
                language: {
                    code: 'ru'
                },
                components: [
                    {
                        type: 'body',
                        parameters: [
                            {
                                type: 'text',
                                text: safeCode
                            }
                        ]
                    },
                    {
                        type: 'button',
                        sub_type: 'URL',
                        index: '0',
                        parameters: [
                            {
                                type: 'text',
                                text: safeCode
                            }
                        ]
                    }
                ]
            }
        };

        return await sendWabaPayload(payload);
    } catch (error) {
        logError('notificationService.sendAuthTemplate', error, {
            phoneNumber: normalizeToTenDigits(phoneNumber),
            toWabaPhone
        });
        return null;
    }
};

const sendTemplateByName = async (phoneNumber, templateName, options = {}) => {
    const toWabaPhone = normalizeToWabaPhone(phoneNumber);
    const safeTemplateName = String(templateName || '').trim();
    const languageCode = String(options.languageCode || 'ru').trim() || 'ru';
    const components = Array.isArray(options.components) ? options.components : [];

    if (!toWabaPhone || !safeTemplateName) {
        logOutgoing('skip_invalid_template_payload', {
            phoneNumber: String(phoneNumber || ''),
            templateName: safeTemplateName
        });
        return null;
    }

    const payload = {
        messaging_product: 'whatsapp',
        to: toWabaPhone,
        type: 'template',
        template: {
            name: safeTemplateName,
            language: {
                code: languageCode
            },
            components
        }
    };

    try {
        return await sendWabaPayload(payload);
    } catch (error) {
        logError('notificationService.sendTemplateByName', error, {
            phoneNumber: normalizeToTenDigits(phoneNumber),
            toWabaPhone,
            templateName: safeTemplateName
        });
        if (options.raiseErrors) {
            throw error;
        }
        return null;
    }
};

const sendOrderTrackingTemplate = async (phoneNumber, trackingNumber) => {
    const toWabaPhone = normalizeToWabaPhone(phoneNumber);
    const safeTrackingNumber = String(trackingNumber || '').trim();
    if (!toWabaPhone || !safeTrackingNumber) {
        logOutgoing('skip_invalid_tracking_payload', {
            phoneNumber: String(phoneNumber || ''),
            trackingNumber: safeTrackingNumber
        });
        return null;
    }

    const trackingUrl = `https://track.greenman.kz/${safeTrackingNumber}`;
    const payload = {
        messaging_product: 'whatsapp',
        to: toWabaPhone,
        type: 'template',
        template: {
            name: 'order_tracking',
            language: {
                code: 'ru'
            },
            components: [
                {
                    type: 'body',
                    parameters: [
                        {
                            type: 'text',
                            text: safeTrackingNumber
                        },
                        {
                            type: 'text',
                            text: trackingUrl
                        }
                    ]
                },
                {
                    type: 'button',
                    sub_type: 'URL',
                    index: '0',
                    parameters: [
                        {
                            type: 'text',
                            text: safeTrackingNumber
                        }
                    ]
                }
            ]
        }
    };

    try {
        return await sendWabaPayload(payload);
    } catch (error) {
        logError('notificationService.sendOrderTrackingTemplate', error, {
            phoneNumber: normalizeToTenDigits(phoneNumber),
            toWabaPhone,
            trackingNumber: safeTrackingNumber
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
module.exports.sendTemplateByName = sendTemplateByName;
module.exports.sendOrderTrackingTemplate = sendOrderTrackingTemplate;
module.exports.flushPendingMessagesByPhone = flushPendingMessagesByPhone;
module.exports.flushPendingMessagesByChatId = flushPendingMessagesByChatId;
