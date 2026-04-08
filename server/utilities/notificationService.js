const axios = require('axios');
const User = require('../models/orders/User');
const ChatwootMessageSync = require('../models/orders/ChatwootMessageSync');
const { normalizePhoneNumber } = require('./paymentLinkUtils');
const { logError } = require('./errorLogger');
const dialog360Service = require('./dialog360Service');
const chatwootService = require('./chatwootService');

const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;
const WINDOW_REOPEN_TEMPLATE_NAME = 'order';
const WINDOW_REOPEN_TEMPLATE_COOLDOWN_MS = 5 * 60 * 1000;
const AUTH_TEMPLATE_NAME = 'auth';
const ERROR_TEMPLATE_NAME = 'error';
const DEFAULT_LANGUAGE_CODE = 'ru';
const FILTERED_ADMIN_PHONE = '7775464450';

const logOutgoing = (event, details = {}) => {
    console.log(`[WhatsApp outgoing] ${event}: ${JSON.stringify(details)}`);
};

const toDigits = (value) => String(value || '').replace(/\D/g, '');
const toText = (value) => String(value || '').trim();

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

const resolveMessageTarget = async (value) => {
    const tenDigitsPhone = normalizeToTenDigits(value);
    const chatId = dialog360Service.normalizePhoneToChatId(value);
    const user = await ensureUserByPhone(tenDigitsPhone);

    return {
        user,
        tenDigitsPhone,
        chatId
    };
};

const buildTextBodyComponent = (...texts) => ({
    type: 'body',
    parameters: texts.map((text) => ({
        type: 'text',
        text: String(text || '').trim()
    })).filter((item) => item.text)
});

const parsePendingMessages = (value) => {
    const raw = String(value || '').trim();
    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch (_error) {
        return [];
    }
};

const savePendingMessages = async (user, messages) => {
    if (!user) {
        return;
    }

    const safeMessages = Array.isArray(messages) ? messages.filter(Boolean) : [];
    await user.update({
        pendingWhatsAppMessages: safeMessages.length > 0 ? JSON.stringify(safeMessages) : null
    });
};

const buildQueuedResult = ({ user, reason, queueLength, templateSent = false, templateResponse = null }) => ({
    queued: true,
    reason,
    queueLength,
    templateSent,
    templateResponse,
    isWaitingForWhatsappWindowOpen: Boolean(user?.isWaitingForWhatsappWindowOpen)
});

const isWindowCurrentlyOpen = (user) => {
    if (!user?.lastIncomingMessageAt) {
        return false;
    }

    const lastIncomingAt = new Date(user.lastIncomingMessageAt).getTime();
    if (!Number.isFinite(lastIncomingAt)) {
        return false;
    }

    return Date.now() - lastIncomingAt < SERVICE_WINDOW_MS;
};

const buildPendingItem = ({
    text = '',
    attachments = [],
    source = 'server',
    sync = null
}) => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    createdAt: new Date().toISOString(),
    source: String(source || 'server').trim(),
    text: String(text || '').trim(),
    attachments: (Array.isArray(attachments) ? attachments : [])
        .map((attachment) => ({
            url: String(attachment?.url || '').trim(),
            fileName: String(attachment?.fileName || '').trim(),
            mimeType: String(attachment?.mimeType || '').trim()
        }))
        .filter((attachment) => attachment.url),
    sync: sync && typeof sync === 'object'
        ? {
            provider: String(sync.provider || '').trim(),
            providerMessageId: String(sync.providerMessageId || '').trim(),
            chatwootContactIdentifier: String(sync.chatwootContactIdentifier || '').trim() || null,
            chatwootConversationId: Number.isFinite(Number(sync.chatwootConversationId))
                ? Number(sync.chatwootConversationId)
                : null
        }
        : null
});

const enqueuePendingItem = async (user, item) => {
    if (!user || !item) {
        return 0;
    }

    const queue = parsePendingMessages(user.pendingWhatsAppMessages);
    queue.push(item);
    await savePendingMessages(user, queue);
    await user.reload();
    return queue.length;
};

const extractErrorCodes = (error) => {
    const codes = new Set();
    const visit = (value) => {
        if (!value) {
            return;
        }

        if (Array.isArray(value)) {
            value.forEach(visit);
            return;
        }

        if (typeof value === 'object') {
            if (value.code !== undefined && value.code !== null) {
                codes.add(String(value.code).trim());
            }
            Object.values(value).forEach(visit);
        }
    };

    visit(error?.response?.data);
    return codes;
};

const stringifyErrorData = (error) => {
    try {
        return JSON.stringify(error?.response?.data || {});
    } catch (_error) {
        return '';
    }
};

const is24HourWindowError = (error) => {
    const codes = extractErrorCodes(error);
    if (codes.has('470') || codes.has('131047')) {
        return true;
    }

    const haystack = [
        error?.message,
        error?.response?.statusText,
        stringifyErrorData(error)
    ].filter(Boolean).join(' ').toLowerCase();

    return haystack.includes('24 hour') ||
        haystack.includes('24-hour') ||
        haystack.includes('customer service window') ||
        haystack.includes('outside the allowed window') ||
        haystack.includes('re-engagement');
};

const sendTextDirect = async (chatId, messageText) => {
    const text = String(messageText || '').trim();
    const normalizedChatId = dialog360Service.normalizePhoneToChatId(chatId);
    if (!normalizedChatId || !text) {
        return [];
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

    return response ? [response] : [];
};

const isAttachmentVoice = (attachment) => dialog360Service.isVoiceMedia({
    mimeType: attachment?.mimeType,
    fileName: attachment?.fileName,
    urlFile: attachment?.url
});

const inferMimeTypeFromPathValue = (value) => {
    const safeValue = String(value || '').trim().toLowerCase();
    if (!safeValue.includes('.')) {
        return '';
    }

    const extension = safeValue.split('.').pop() || '';
    if (extension === 'aac') {
        return 'audio/aac';
    }
    if (extension === 'amr') {
        return 'audio/amr';
    }
    if (extension === 'mp3') {
        return 'audio/mpeg';
    }
    if (extension === 'm4a') {
        return 'audio/mp4';
    }
    if (extension === 'ogg' || extension === 'oga') {
        return 'audio/ogg';
    }
    if (extension === 'opus') {
        return 'audio/opus';
    }
    if (extension === 'jpg' || extension === 'jpeg') {
        return 'image/jpeg';
    }
    if (extension === 'png') {
        return 'image/png';
    }
    if (extension === 'webp') {
        return 'image/webp';
    }
    if (extension === 'mp4') {
        return 'video/mp4';
    }
    if (extension === '3gp' || extension === '3gpp') {
        return 'video/3gpp';
    }
    if (extension === 'pdf') {
        return 'application/pdf';
    }
    if (extension === 'txt') {
        return 'text/plain';
    }

    return '';
};

const resolveAttachmentMimeType = (attachment, responseMimeType = '') => {
    const rawMimeType = String(attachment?.mimeType || '').trim().toLowerCase();
    const normalizedResponseMimeType = String(responseMimeType || '').trim().toLowerCase();
    const inferredMimeType =
        inferMimeTypeFromPathValue(attachment?.fileName) ||
        inferMimeTypeFromPathValue(attachment?.url);

    if (inferredMimeType) {
        const inferredGroup = inferredMimeType.split('/')[0];
        const rawGroup = rawMimeType.split('/')[0];
        const responseGroup = normalizedResponseMimeType.split('/')[0];

        if (!rawMimeType || rawMimeType === 'audio' || rawMimeType === 'image' || rawMimeType === 'video') {
            return inferredMimeType;
        }

        if (rawGroup && rawGroup === inferredGroup && rawMimeType !== inferredMimeType) {
            return inferredMimeType;
        }

        if (normalizedResponseMimeType && responseGroup === inferredGroup && normalizedResponseMimeType !== inferredMimeType) {
            return inferredMimeType;
        }
    }

    return normalizedResponseMimeType || rawMimeType || 'application/octet-stream';
};

const shouldSendTextSeparately = ({ attachments, textContent }) => {
    const safeText = String(textContent || '').trim();
    const safeAttachments = Array.isArray(attachments) ? attachments.filter(Boolean) : [];

    if (!safeText || safeAttachments.length === 0) {
        return false;
    }

    if (safeAttachments.length > 1) {
        return true;
    }

    const firstAttachment = safeAttachments[0];
    const mediaType = dialog360Service.normalizeMediaType({
        mimeType: firstAttachment?.mimeType,
        fileName: firstAttachment?.fileName,
        urlFile: firstAttachment?.url
    });

    return !dialog360Service.supportsCaptionForMediaType(mediaType);
};

const downloadAttachmentBuffer = async (attachment) => {
    const url = String(attachment?.url || '').trim();
    if (!url) {
        return null;
    }

    const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 120000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
    });

    const buffer = Buffer.from(response.data || []);
    if (buffer.length === 0) {
        return null;
    }

    return {
        buffer,
        mimeType: String(response.headers?.['content-type'] || '').trim()
    };
};

const sendAttachmentsDirect = async ({ chatId, attachments, textContent }) => {
    const normalizedChatId = dialog360Service.normalizePhoneToChatId(chatId);
    const safeAttachments = Array.isArray(attachments) ? attachments.filter(Boolean) : [];

    if (!normalizedChatId || safeAttachments.length === 0) {
        return {
            responses: [],
            textSentSeparately: false
        };
    }

    const responses = [];
    const textSentSeparately = shouldSendTextSeparately({
        attachments: safeAttachments,
        textContent
    });

    if (textSentSeparately) {
        const textResponses = await sendTextDirect(normalizedChatId, textContent);
        responses.push(...textResponses);
    }

    for (const [index, attachment] of safeAttachments.entries()) {
        const downloadedAttachment = await downloadAttachmentBuffer(attachment);
        if (!downloadedAttachment?.buffer) {
            continue;
        }
        const effectiveMimeType = resolveAttachmentMimeType(attachment, downloadedAttachment.mimeType);

        const mediaType = dialog360Service.normalizeMediaType({
            mimeType: effectiveMimeType,
            fileName: attachment?.fileName,
            urlFile: attachment?.url
        });
        const useCaption = !textSentSeparately && index === 0 && dialog360Service.supportsCaptionForMediaType(mediaType);

        const response = await dialog360Service.sendFileByUpload({
            chatId: normalizedChatId,
            fileBuffer: downloadedAttachment.buffer,
            fileName: attachment?.fileName,
            mimeType: effectiveMimeType,
            caption: useCaption ? String(textContent || '').trim() : '',
            voice: dialog360Service.isVoiceMedia({
                mimeType: effectiveMimeType,
                fileName: attachment?.fileName,
                urlFile: attachment?.url,
                voice: isAttachmentVoice(attachment)
            })
        });

        if (response) {
            responses.push(response);
        }
    }

    return {
        responses,
        textSentSeparately
    };
};

const sendDirectContent = async ({ chatId, text = '', attachments = [] }) => {
    const safeText = String(text || '').trim();
    const safeAttachments = Array.isArray(attachments) ? attachments.filter(Boolean) : [];

    if (safeAttachments.length > 0) {
        return sendAttachmentsDirect({
            chatId,
            attachments: safeAttachments,
            textContent: safeText
        });
    }

    return {
        responses: await sendTextDirect(chatId, safeText),
        textSentSeparately: false
    };
};

const extractProviderMessageIds = (responses) => (Array.isArray(responses) ? responses : [])
    .map((response) => String(response?.idMessage || '').trim())
    .filter(Boolean);

const updateChatwootSyncAfterDelivery = async ({ item, user, chatId, providerMessageIds }) => {
    const provider = String(item?.sync?.provider || '').trim();
    const providerMessageId = String(item?.sync?.providerMessageId || '').trim();
    if (provider !== 'chatwoot' || !providerMessageId) {
        return;
    }

    const lastProviderMessageId = providerMessageIds[providerMessageIds.length - 1] || null;
    if (!lastProviderMessageId) {
        return;
    }

    const [sync] = await ChatwootMessageSync.findOrCreate({
        where: {
            provider,
            providerMessageId
        },
        defaults: {
            provider,
            providerMessageId,
            customerPhone: user?.phoneNumber || null,
            customerChatId: chatId || null,
            chatwootContactIdentifier: item?.sync?.chatwootContactIdentifier || null,
            chatwootConversationId: Number.isFinite(Number(item?.sync?.chatwootConversationId))
                ? Number(item.sync.chatwootConversationId)
                : null,
            chatwootMessageId: lastProviderMessageId
        }
    });

    const patch = {};
    if (!sync.customerPhone && user?.phoneNumber) {
        patch.customerPhone = user.phoneNumber;
    }
    if (!sync.customerChatId && chatId) {
        patch.customerChatId = chatId;
    }
    if (!sync.chatwootContactIdentifier && item?.sync?.chatwootContactIdentifier) {
        patch.chatwootContactIdentifier = item.sync.chatwootContactIdentifier;
    }
    if (!sync.chatwootConversationId && Number.isFinite(Number(item?.sync?.chatwootConversationId))) {
        patch.chatwootConversationId = Number(item.sync.chatwootConversationId);
    }
    if (sync.chatwootMessageId !== lastProviderMessageId) {
        patch.chatwootMessageId = lastProviderMessageId;
    }

    if (Object.keys(patch).length > 0) {
        await sync.update(patch);
    }
};

const sendTemplateDirect = async ({ phoneNumber, templateName, languageCode = DEFAULT_LANGUAGE_CODE, components = [] }) => {
    return dialog360Service.sendTemplate({
        chatId: phoneNumber,
        templateName,
        languageCode,
        components
    });
};

const buildMirrorSummaryForAttachments = (attachments) => {
    const safeAttachments = Array.isArray(attachments) ? attachments.filter(Boolean) : [];
    if (safeAttachments.length === 0) {
        return '';
    }

    return safeAttachments.map((attachment) => {
        const fileName = String(attachment?.fileName || '').trim();
        return fileName ? `[Файл] ${fileName}` : '[Файл]';
    }).join('\n');
};

const mirrorOutboundToChatwootSafe = async ({ source, phoneNumber, text = '', attachments = [], providerMessageIds = [] }) => {
    if (String(source || '').trim() === 'chatwoot') {
        return;
    }

    const providerMessageId = Array.isArray(providerMessageIds) && providerMessageIds.length > 0
        ? String(providerMessageIds[providerMessageIds.length - 1] || '').trim()
        : '';
    const normalizedPhone = normalizeToTenDigits(phoneNumber);
    const mirrorText = String(text || '').trim() || buildMirrorSummaryForAttachments(attachments);

    if (!providerMessageId || !normalizedPhone || !mirrorText) {
        return;
    }

    await chatwootService.syncOutgoingSystemMessageSafe({
        customerPhone: normalizedPhone,
        content: mirrorText,
        providerMessageId
    });
};

const maybeSendWindowReopenTemplate = async (user, phoneNumber) => {
    if (!user || !phoneNumber) {
        return {
            sent: false,
            skipped: true,
            reason: 'missing_target'
        };
    }

    const lastSentAtMs = user.lastAgreeTemplateSentAt ? new Date(user.lastAgreeTemplateSentAt).getTime() : 0;
    const isCoolingDown = Number.isFinite(lastSentAtMs) && (Date.now() - lastSentAtMs) < WINDOW_REOPEN_TEMPLATE_COOLDOWN_MS;

    if (user.isWaitingForWhatsappWindowOpen || isCoolingDown) {
        return {
            sent: false,
            skipped: true,
            reason: user.isWaitingForWhatsappWindowOpen ? 'already_waiting' : 'cooldown'
        };
    }

    await user.update({
        lastAgreeTemplateSentAt: new Date()
    });

    try {
        const response = await sendTemplateDirect({
            phoneNumber,
            templateName: WINDOW_REOPEN_TEMPLATE_NAME
        });

        await mirrorOutboundToChatwootSafe({
            source: 'server',
            phoneNumber,
            text: `[Шаблон ${WINDOW_REOPEN_TEMPLATE_NAME}]`,
            providerMessageIds: [String(response?.idMessage || '').trim()]
        });

        await user.update({
            isWaitingForWhatsappWindowOpen: true,
            lastAgreeTemplateSentAt: new Date()
        });

        return {
            sent: true,
            response
        };
    } catch (error) {
        logError('notificationService.maybeSendWindowReopenTemplate', error, {
            phoneNumber: user.phoneNumber,
            templateName: WINDOW_REOPEN_TEMPLATE_NAME
        });
        return {
            sent: false,
            error
        };
    }
};

const sendContentWithWindowHandling = async ({
    phoneNumber,
    text = '',
    attachments = [],
    source = 'server',
    enforce24h = true,
    queueIfNeeded = true,
    sync = null
}) => {
    const { user, tenDigitsPhone, chatId } = await resolveMessageTarget(phoneNumber);
    const safeText = String(text || '').trim();
    const safeAttachments = Array.isArray(attachments) ? attachments.filter(Boolean) : [];

    if (!user || !tenDigitsPhone || !chatId) {
        logOutgoing('skip_invalid_target', {
            phoneNumber: String(phoneNumber || ''),
            tenDigitsPhone,
            chatId
        });
        return null;
    }

    if (safeText && shouldSkipSpecialAdminMessage(phoneNumber, safeText)) {
        logOutgoing('skip_filtered_admin_message', {
            phoneNumber: tenDigitsPhone,
            chatId,
            preview: safeText.slice(0, 80)
        });
        return null;
    }

    if (!safeText && safeAttachments.length === 0) {
        return null;
    }

    const queueCurrentMessage = async (reason) => {
        if (!queueIfNeeded) {
            return null;
        }

        const queueLength = await enqueuePendingItem(user, buildPendingItem({
            text: safeText,
            attachments: safeAttachments,
            source,
            sync
        }));
        await user.reload();
        const templateResult = await maybeSendWindowReopenTemplate(user, tenDigitsPhone);
        await user.reload();

        return buildQueuedResult({
            user,
            reason,
            queueLength,
            templateSent: Boolean(templateResult?.sent),
            templateResponse: templateResult?.response || null
        });
    };

    if (enforce24h && !isWindowCurrentlyOpen(user)) {
        return queueCurrentMessage('window_closed');
    }

    try {
        const delivery = await sendDirectContent({
            chatId,
            text: safeText,
            attachments: safeAttachments
        });
        const providerMessageIds = extractProviderMessageIds(delivery.responses);

        await mirrorOutboundToChatwootSafe({
            source,
            phoneNumber: tenDigitsPhone,
            text: safeText,
            attachments: safeAttachments,
            providerMessageIds
        });

        logOutgoing('content_sent', {
            phoneNumber: tenDigitsPhone,
            chatId,
            textLength: safeText.length,
            attachments: safeAttachments.length,
            providerMessageIds
        });

        return {
            queued: false,
            phoneNumber: tenDigitsPhone,
            chatId,
            responses: delivery.responses,
            providerResponses: delivery.responses,
            providerMessageIds,
            providerResponse: delivery.responses[delivery.responses.length - 1] || null,
            textSentSeparately: Boolean(delivery.textSentSeparately)
        };
    } catch (error) {
        if (enforce24h && queueIfNeeded && is24HourWindowError(error)) {
            return queueCurrentMessage('provider_window_closed');
        }

        throw error;
    }
};

const sendNotification = async (phoneNumber, message, options = {}) => {
    try {
        const result = await sendContentWithWindowHandling({
            phoneNumber,
            text: message,
            enforce24h: options.enforce24h !== false,
            queueIfNeeded: options.queueIfNeeded !== false,
            source: 'server'
        });

        return result?.queued ? result : result?.providerResponse || null;
    } catch (error) {
        logError('notificationService.sendNotification', error, {
            phoneNumber: normalizeToTenDigits(phoneNumber),
            chatId: dialog360Service.normalizePhoneToChatId(phoneNumber)
        });
        return null;
    }
};

const sendToChatId = async (chatId, message, options = {}) => {
    try {
        const result = await sendContentWithWindowHandling({
            phoneNumber: chatId,
            text: message,
            enforce24h: options.enforce24h !== false,
            queueIfNeeded: options.queueIfNeeded !== false,
            source: 'server'
        });

        return result?.queued ? result : result?.providerResponse || null;
    } catch (error) {
        logError('notificationService.sendToChatId', error, {
            phoneNumber: normalizeToTenDigits(chatId),
            chatId: dialog360Service.normalizePhoneToChatId(chatId)
        });
        return null;
    }
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

    try {
        const { tenDigitsPhone } = await resolveMessageTarget(phoneNumber);
        const providerResponse = await sendTemplateDirect({
            phoneNumber,
            templateName: safeTemplateName,
            languageCode: String(options.languageCode || options.language?.code || DEFAULT_LANGUAGE_CODE).trim() || DEFAULT_LANGUAGE_CODE,
            components: Array.isArray(options.components) ? options.components : []
        });
        const textParts = (Array.isArray(options.components) ? options.components : [])
            .flatMap((component) => Array.isArray(component?.parameters) ? component.parameters : [])
            .map((parameter) => String(parameter?.text || '').trim())
            .filter(Boolean);
        const mirrorContent = String(options.mirrorContent || '').trim() || (
            textParts.length > 0
                ? `[Шаблон ${safeTemplateName}] ${textParts.join(' ')}`
                : `[Шаблон ${safeTemplateName}]`
        );

        await mirrorOutboundToChatwootSafe({
            source: options.source || 'server',
            phoneNumber: tenDigitsPhone,
            text: mirrorContent,
            providerMessageIds: [String(providerResponse?.idMessage || '').trim()]
        });

        logOutgoing('dialog360_send_template', {
            phoneNumber: tenDigitsPhone,
            templateName: safeTemplateName,
            providerResponse
        });

        return providerResponse;
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

const sendErrorTemplate = async (phoneNumber, errorText, options = {}) => {
    const safeText = String(errorText || '').trim();
    if (!safeText) {
        return null;
    }

    return sendTemplateByName(phoneNumber, ERROR_TEMPLATE_NAME, {
        ...options,
        mirrorContent: safeText,
        components: [
            buildTextBodyComponent(safeText)
        ]
    });
};

const sendAuthTemplate = async (phoneNumber, code, options = {}) => {
    const safeCode = String(code || '').replace(/\D/g, '').slice(0, 6);
    if (safeCode.length !== 6) {
        logOutgoing('skip_invalid_auth_payload', {
            phoneNumber: String(phoneNumber || ''),
            codeLength: safeCode.length
        });
        return null;
    }

    const authComponents = [
        buildTextBodyComponent(safeCode),
        {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [
                {
                    type: 'text',
                    text: safeCode
                }
            ]
        }
    ];

    try {
        return await sendTemplateByName(phoneNumber, AUTH_TEMPLATE_NAME, {
            ...options,
            mirrorContent: `Код подтверждения Greenman: ${safeCode}`,
            raiseErrors: true,
            components: authComponents
        });
    } catch (error) {
        const errorText = stringifyErrorData(error).toLowerCase();
        const canRetryWithoutButton =
            errorText.includes('button') ||
            errorText.includes('sub_type') ||
            errorText.includes('index') ||
            errorText.includes('component');

        if (!canRetryWithoutButton) {
            logError('notificationService.sendAuthTemplate', error, {
                phoneNumber: normalizeToTenDigits(phoneNumber)
            });

            if (options.raiseErrors) {
                throw error;
            }

            return null;
        }

        try {
            return await sendTemplateByName(phoneNumber, AUTH_TEMPLATE_NAME, {
                ...options,
                mirrorContent: `Код подтверждения Greenman: ${safeCode}`,
                raiseErrors: true,
                components: [
                    buildTextBodyComponent(safeCode)
                ]
            });
        } catch (retryError) {
            logError('notificationService.sendAuthTemplate', retryError, {
                phoneNumber: normalizeToTenDigits(phoneNumber)
            });

            if (options.raiseErrors) {
                throw retryError;
            }

            return null;
        }
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

const flushPendingMessagesForUser = async (user) => {
    if (!user) {
        return {
            sentCount: 0,
            pendingCount: 0
        };
    }

    const queue = parsePendingMessages(user.pendingWhatsAppMessages);
    if (queue.length === 0) {
        await user.update({
            isWaitingForWhatsappWindowOpen: false
        });
        return {
            sentCount: 0,
            pendingCount: 0
        };
    }

    if (!isWindowCurrentlyOpen(user)) {
        const templateResult = await maybeSendWindowReopenTemplate(user, user.phoneNumber);
        await user.reload();
        return {
            sentCount: 0,
            pendingCount: queue.length,
            templateSent: Boolean(templateResult?.sent)
        };
    }

    const remaining = [...queue];
    let sentCount = 0;

    while (remaining.length > 0) {
        const item = remaining[0];

        try {
            const delivery = await sendDirectContent({
                chatId: user.phoneNumber,
                text: item?.text,
                attachments: item?.attachments
            });
            const providerMessageIds = extractProviderMessageIds(delivery.responses);

            await mirrorOutboundToChatwootSafe({
                source: item?.source || 'server',
                phoneNumber: user.phoneNumber,
                text: item?.text,
                attachments: item?.attachments,
                providerMessageIds
            });

            await updateChatwootSyncAfterDelivery({
                item,
                user,
                chatId: dialog360Service.normalizePhoneToChatId(user.phoneNumber),
                providerMessageIds
            });

            remaining.shift();
            sentCount += 1;
        } catch (error) {
            if (is24HourWindowError(error)) {
                await savePendingMessages(user, remaining);
                await user.update({
                    isWaitingForWhatsappWindowOpen: false
                });
                const templateResult = await maybeSendWindowReopenTemplate(user, user.phoneNumber);
                await user.reload();

                return {
                    sentCount,
                    pendingCount: remaining.length,
                    templateSent: Boolean(templateResult?.sent)
                };
            }

            logError('notificationService.flushPendingMessagesForUser', error, {
                phoneNumber: user.phoneNumber,
                pendingCount: remaining.length
            });

            await savePendingMessages(user, remaining);
            return {
                sentCount,
                pendingCount: remaining.length
            };
        }
    }

    await savePendingMessages(user, []);
    await user.update({
        isWaitingForWhatsappWindowOpen: false
    });

    return {
        sentCount,
        pendingCount: 0
    };
};

const flushPendingMessagesByPhone = async (phoneNumber) => {
    const tenDigitsPhone = normalizeToTenDigits(phoneNumber);
    if (!tenDigitsPhone) {
        return {
            sentCount: 0,
            pendingCount: 0
        };
    }

    const user = await User.findOne({
        where: {
            phoneNumber: tenDigitsPhone
        }
    });

    return flushPendingMessagesForUser(user);
};

const flushPendingMessagesByChatId = async (chatId) => {
    return flushPendingMessagesByPhone(chatId);
};

const sendChatwootOutbound = async ({
    phoneNumber,
    textContent = '',
    attachments = [],
    chatwootMessageId,
    chatwootContactIdentifier = null,
    chatwootConversationId = null
}) => {
    return sendContentWithWindowHandling({
        phoneNumber,
        text: textContent,
        attachments,
        source: 'chatwoot',
        enforce24h: true,
        queueIfNeeded: true,
        sync: {
            provider: 'chatwoot',
            providerMessageId: chatwootMessageId,
            chatwootContactIdentifier,
            chatwootConversationId
        }
    });
};

module.exports = sendNotification;
module.exports.sendToChatId = sendToChatId;
module.exports.sendTemplateByName = sendTemplateByName;
module.exports.sendErrorTemplate = sendErrorTemplate;
module.exports.sendAuthTemplate = sendAuthTemplate;
module.exports.sendOrderTrackingTemplate = sendOrderTrackingTemplate;
module.exports.flushPendingMessagesByPhone = flushPendingMessagesByPhone;
module.exports.flushPendingMessagesByChatId = flushPendingMessagesByChatId;
module.exports.sendChatwootOutbound = sendChatwootOutbound;
module.exports.is24HourWindowError = is24HourWindowError;
