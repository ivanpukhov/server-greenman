const User = require('../models/orders/User');
const { normalizePhoneNumber } = require('./paymentLinkUtils');
const { logError } = require('./errorLogger');
const dialog360Service = require('./dialog360Service');

const logOutgoing = (event, details = {}) => {
    console.log(`[WhatsApp outgoing] ${event}: ${JSON.stringify(details)}`);
};

const toDigits = (value) => String(value || '').replace(/\D/g, '');
const toText = (value) => String(value || '').trim();
const FILTERED_ADMIN_PHONE = '7775464450';

const startsWithNormalizedPrefix = (value, prefix) =>
    String(value || '')
        .replace(/\u00A0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
        .startsWith(String(prefix || '').trim().toLowerCase());

const shouldSkipSpecialAdminMessage = (phoneOrChatId, messageText) => {
    const tenDigitsPhone = normalizeToTenDigits(phoneOrChatId);
    if (tenDigitsPhone !== FILTERED_ADMIN_PHONE) {
        return false;
    }

    const text = toText(messageText);
    return startsWithNormalizedPrefix(text, 'Ваш заказ') || startsWithNormalizedPrefix(text, 'Казпочта');
};

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

const sendTextDirect = async (chatId, messageText) => {
    const text = String(messageText || '').trim();
    const normalizedChatId = dialog360Service.normalizePhoneToChatId(chatId);
    if (!normalizedChatId || !text) {
        return null;
    }

    const response = await dialog360Service.sendMessage({
        chatId: normalizedChatId,
        message: text
    });

    logOutgoing('dialog360_send_message', {
        chatId: normalizedChatId,
        textLength: text.length,
        response
    });

    return response;
};

const sendNotification = async (phoneNumber, message) => {
    const tenDigitsPhone = normalizeToTenDigits(phoneNumber);
    const chatId = dialog360Service.normalizePhoneToChatId(phoneNumber);

    if (!tenDigitsPhone || !chatId) {
        logOutgoing('skip_invalid_phone', {
            phoneNumber: String(phoneNumber || ''),
            tenDigitsPhone,
            chatId
        });
        return null;
    }

    if (shouldSkipSpecialAdminMessage(phoneNumber, message)) {
        logOutgoing('skip_filtered_admin_message', {
            phoneNumber: tenDigitsPhone,
            chatId,
            preview: toText(message).slice(0, 80)
        });
        return null;
    }

    try {
        await ensureUserByPhone(tenDigitsPhone);
        return await sendTextDirect(chatId, message);
    } catch (error) {
        logError('notificationService.sendNotification', error, {
            phoneNumber: tenDigitsPhone,
            chatId
        });
        return null;
    }
};

const sendToChatId = async (chatId, message) => {
    const tenDigitsPhone = normalizeToTenDigits(chatId);
    const normalizedChatId = dialog360Service.normalizePhoneToChatId(chatId);
    if (!tenDigitsPhone || !normalizedChatId) {
        logOutgoing('skip_invalid_chat_id', {
            chatId: String(chatId || '')
        });
        return null;
    }

    if (shouldSkipSpecialAdminMessage(chatId, message)) {
        logOutgoing('skip_filtered_admin_message', {
            phoneNumber: tenDigitsPhone,
            chatId: normalizedChatId,
            preview: toText(message).slice(0, 80)
        });
        return null;
    }

    try {
        await ensureUserByPhone(tenDigitsPhone);
        return await sendTextDirect(normalizedChatId, message);
    } catch (error) {
        logError('notificationService.sendToChatId', error, {
            phoneNumber: tenDigitsPhone,
            chatId: normalizedChatId
        });
        return null;
    }
};

const sendAuthTemplate = async (phoneNumber, code) => {
    const safeCode = String(code || '').replace(/\D/g, '').slice(0, 6);
    if (safeCode.length !== 6) {
        logOutgoing('skip_invalid_auth_payload', {
            phoneNumber: String(phoneNumber || ''),
            codeLength: safeCode.length
        });
        return null;
    }

    return sendNotification(phoneNumber, `Код подтверждения Greenman: ${safeCode}`);
};

const sendTemplateByName = async (phoneNumber, templateName, options = {}) => {
    const safeTemplateName = String(templateName || '').trim();
    if (!safeTemplateName) {
        logOutgoing('skip_invalid_template_payload', {
            phoneNumber: String(phoneNumber || ''),
            templateName: safeTemplateName
        });
        return null;
    }

    const components = Array.isArray(options.components) ? options.components : [];
    const textParts = components
        .flatMap((component) => Array.isArray(component?.parameters) ? component.parameters : [])
        .map((parameter) => String(parameter?.text || '').trim())
        .filter(Boolean);

    const fallbackText = textParts.length > 0
        ? `${safeTemplateName}: ${textParts.join(' ')}`
        : safeTemplateName;

    try {
        const providerResponse = await dialog360Service.sendTemplate({
            chatId: phoneNumber,
            templateName: safeTemplateName,
            languageCode: String(options.languageCode || options.language?.code || 'ru').trim() || 'ru',
            components
        });

        if (providerResponse) {
            return providerResponse;
        }

        return await sendNotification(phoneNumber, fallbackText);
    } catch (error) {
        logError('notificationService.sendTemplateByName', error, {
            phoneNumber: normalizeToTenDigits(phoneNumber),
            templateName: safeTemplateName
        });
        if (options.raiseErrors) {
            throw error;
        }
        return null;
    }
};

const sendOrderTrackingTemplate = async (phoneNumber, trackingNumber) => {
    const safeTrackingNumber = String(trackingNumber || '').trim();
    if (!safeTrackingNumber) {
        logOutgoing('skip_invalid_tracking_payload', {
            phoneNumber: String(phoneNumber || ''),
            trackingNumber: safeTrackingNumber
        });
        return null;
    }

    return sendNotification(
        phoneNumber,
        `Ваш трек-номер: ${safeTrackingNumber}\nОтследить: https://track.greenman.kz/${safeTrackingNumber}`
    );
};

const flushPendingMessagesByPhone = async () => ({
    sentCount: 0,
    pendingCount: 0
});

const flushPendingMessagesByChatId = async () => ({
    sentCount: 0,
    pendingCount: 0
});

module.exports = sendNotification;
module.exports.sendToChatId = sendToChatId;
module.exports.sendAuthTemplate = sendAuthTemplate;
module.exports.sendTemplateByName = sendTemplateByName;
module.exports.sendOrderTrackingTemplate = sendOrderTrackingTemplate;
module.exports.flushPendingMessagesByPhone = flushPendingMessagesByPhone;
module.exports.flushPendingMessagesByChatId = flushPendingMessagesByChatId;
