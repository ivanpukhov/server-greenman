const express = require('express');
const axios = require('axios');
const Sequelize = require('sequelize');
const https = require('https');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const pdfParse = require('pdf-parse');
const PaymentLink = require('../models/orders/PaymentLink');
const SentPaymentLink = require('../models/orders/SentPaymentLink');
const OrderBundle = require('../models/orders/OrderBundle');
const KazpostRequest = require('../models/orders/KazpostRequest');
const OrderDraftRequest = require('../models/orders/OrderDraftRequest');
const Expense = require('../models/orders/Expense');
const Order = require('../models/orders/Order');
const User = require('../models/orders/User');
const Product = require('../models/Product');
const ProductType = require('../models/ProductType');
const sendMessageToChannel = require('../utilities/sendMessageToChannel');
const sendNotification = require('../utilities/notificationService');
const baileysNotificationService = require('../services/baileysNotificationService');
const { ORDER_DRAFT_AI_API_KEY } = require('../config/orderDraftAiApiKey');
const { WHATSAPP_360DIALOG_API_URL, WHATSAPP_360DIALOG_API_KEY } = require('../config/whatsapp360dialog');
const {
    findMatchedLinkInDescription,
    normalizePhoneNumber,
    attachRecentPaymentLinkToOrder,
    markPaymentLinkConnectionAsUsed,
    canAutoMarkOrderAsPaidByConnection
} = require('../utilities/paymentLinkUtils');
const { pickNextPaymentLinkByDispatchPlan } = require('../utilities/paymentLinkDispatchPlan');
const { getActiveAdmins, getAdminByPhone, normalizeAdminIin, normalizeAdminIinStrict } = require('../utilities/adminUsers');
const { buildErrorDetails, formatErrorMessage } = require('../utilities/errorDetails');

const router = express.Router();
const { Op } = Sequelize;

const GREEN_API_SEND_FILE_URL =
    'https://7700.api.greenapi.com/waInstance7700541881/sendFileByUrl/2112835cf7a7459ba6de00c353163555b08baeb8d4b6413da2';
const QR_MIRROR_CHAT_ID = '77775464450@c.us';
const PDF_PROOF_DEBUG_PHONE = '77073670497';

const DEFAULT_CAPTION =
    'Посылочка идет на отправку. ‼️ Видео обязательно к просмотру ‼️ Обязательно сверьте свой заказ с содержимым коробки';
const ORDER_DRAFT_SOURCE_PREFIX = '__ORDER_DRAFT__';
const ORDER_DRAFT_TTL_MS = 1000 * 60 * 60 * 6;
const PAYMENT_LINK_DUPLICATE_WINDOW_MS = 1000 * 60 * 3;
const pendingOrderDraftByChatId = new Map();
const processedKazpostCommandByMessageId = new Map();
const PAYMENT_LINK_FOOTER =
    'После оплаты скиньте пожалуйста чек\n‼️Без чека отправки не будет';
const ORDER_BUNDLE_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const ORDER_DRAFT_AI_URL = 'https://openrouter.ai/api/v1/chat/completions';
const ORDER_DRAFT_AI_MODEL = 'openai/gpt-5-mini';
const openRouterHttpsAgent = new https.Agent({
    keepAlive: true,
    family: 4
});
const KAZPOST_COMMAND_PRODUCT_ID = 61;
const KAZPOST_COMMAND_TYPE_ID = 137;
const KAZPOST_COMMAND_DEDUP_TTL_MS = 1000 * 60 * 60 * 6;
const KAZPOST_REQUEST_TIMEOUT_MS = 1000 * 60 * 10;
const KAZPOST_FALLBACK_ADMIN_PHONE = '7073670497';
const INCOMING_MESSAGE_GREET_INTERVAL_MS = 1000 * 60 * 60 * 24 * 14;
const INCOMING_MESSAGE_GREETING =
    'Вас приветствует команда травника Greenman 🌿\n\n' +
    '‼️Чтобы получить качественную консультацию и быстро оформить заказ,          внимательно заполните анкету.\n\n' +
    '📋 Для консультации по подбору трав укажите:\n\n' +
    '1️⃣ Возраст\n' +
    '2️⃣ Вес\n' +
    '3️⃣ Хронические заболевания\n' +
    '4️⃣ Что вас беспокоит\n' +
    '5️⃣ Поставленный диагноз\n' +
    '6️⃣ Результаты обследований (УЗИ, анализы и др.)\n\n' +
    '📎 Если есть обследования — прикрепляйте сразу.\n' +
    '❗️Особенно важно чётко указать диагноз.\n\n' +
    '⸻\n\n' +
    '📦 Для отправки заказа по почте сразу оставьте:\n\n' +
    '• Фамилия, имя, отчество\n' +
    '• Город\n' +
    '• Полный адрес\n' +
    '• Индекс почтового отделения\n' +
    '• Номер телефона\n\n' +
    '⸻\n\n' +
    '🛒 Если консультация не нужна и вы уже определились:\n\n' +
    'Обязательно укажите:\n\n' +
    '• Название продукции\n' +
    '• Форму — на мёду / на водно-спиртовой основе / в пакетиках для заваривания\n' +
    '• Количество\n' +
    '• Данные для отправки\n\n' +
    'Также вы можете оформить заказ напрямую на сайте:\n' +
    '🌍 Сайт для Казахстана\n' +
    'https://greenman.kz\n\n' +
    '🌍 Сайт для России\n' +
    'https://green-man.ru \n\n' +
    '⸻\n\n' +
    '⏳ Отвечаем в порядке очереди. В будние дни с 9-17часов\n\n' +
    '➡️Запросов на консультацию много, поэтому, чтобы вас обслужили быстрее — заполните анкету максимально полно и понятно.\n\n' +
    'В освободившееся окно мы свяжемся с вами, подберём индивидуальный курс и отправим посылку 🌿';
const ORDER_DRAFT_AI_FALLBACK_PROMPT = `
GPT принимает одно сообщение = один заказ и возвращает строго один JSON-объект.
Верни только JSON:
{"kot":"Имя Фамилия","user_input":"индекс","street":"полный адрес","number":"номер телефона"}
Правила:
- kot: имя и фамилия клиента.
- user_input: почтовый индекс (6 цифр).
- street: полный адрес строкой.
- number: телефон клиента.
`;

const loadIdeaForAiFile = () => {
    try {
        const filePath = path.resolve(__dirname, '../../idea_for_ai.js');
        return fs.readFileSync(filePath, 'utf8');
    } catch (_error) {
        return '';
    }
};

const extractSystemPromptFromIdeaFile = (source) => {
    const match = String(source || '').match(/const SYSTEM_PROMPT = `([\s\S]*?)`;\s*export default/);
    if (!match || !match[1]) {
        return null;
    }
    return String(match[1]).trim();
};

const ideaForAiSource = loadIdeaForAiFile();
const ORDER_DRAFT_AI_SYSTEM_PROMPT =
    extractSystemPromptFromIdeaFile(ideaForAiSource) || ORDER_DRAFT_AI_FALLBACK_PROMPT;

const safeStringify = (value) => {
    const seen = new WeakSet();

    return JSON.stringify(
        value,
        (key, currentValue) => {
            if (typeof currentValue === 'object' && currentValue !== null) {
                if (seen.has(currentValue)) {
                    return '[Circular]';
                }
                seen.add(currentValue);
            }

            return currentValue;
        },
        2
    );
};

const findFirstValueByKey = (source, targetKey) => {
    if (source === null || source === undefined) {
        return null;
    }

    if (Array.isArray(source)) {
        for (const item of source) {
            const value = findFirstValueByKey(item, targetKey);
            if (value !== null && value !== undefined) {
                return value;
            }
        }
        return null;
    }

    if (typeof source === 'object') {
        if (Object.prototype.hasOwnProperty.call(source, targetKey)) {
            return source[targetKey];
        }

        for (const key of Object.keys(source)) {
            const value = findFirstValueByKey(source[key], targetKey);
            if (value !== null && value !== undefined) {
                return value;
            }
        }
    }

    return null;
};

const sendFileByUrl = async (url, phoneNumber, fileName) => {
    console.log(`Attempting to send file: URL - ${url}, Phone Number - ${phoneNumber}, File Name - ${fileName}`);

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const to = normalizedPhone ? `7${normalizedPhone}` : String(phoneNumber || '').replace(/\D/g, '');
    if (!to) {
        throw new Error('Invalid phone number for 360dialog video send');
    }

    try {
        const sourceUrl = String(url || '').trim();
        const mediaResponse = await axios.get(sourceUrl, {
            responseType: 'arraybuffer',
            timeout: 60000
        });
        const mediaBuffer = Buffer.from(mediaResponse.data);
        if (!mediaBuffer || mediaBuffer.length === 0) {
            throw new Error('Downloaded media buffer is empty');
        }
        await sendVideoBufferTo360Dialog(mediaBuffer, to, fileName, sourceUrl);
    } catch (error) {
        console.error('[WhatsApp webhook] sendFileByUrl (video upload via 360dialog) failed:', {
            status: error.response?.status || null,
            data: error.response?.data || null,
            message: error.message
        });
        throw error;
    }
};

const isWhatsAppEncryptedMediaUrl = (value) => {
    const raw = String(value || '').trim();
    if (!raw) {
        return false;
    }

    return /(?:^https:\/\/|\/\/)?(?:mmg\.whatsapp\.net|lookaside\.whatsapp\.com)\//i.test(raw) ||
        /\.enc(?:$|\?)/i.test(raw);
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const is360DialogInvalidParameterError = (error) => {
    const responseData = error?.response?.data || {};
    const errorBody = responseData?.error || {};
    return Number(errorBody?.code) === 100 ||
        String(errorBody?.message || '').includes('Invalid parameter') ||
        String(errorBody?.error_data?.details || '').includes('Invalid parameter');
};

const send360DialogVideoMessageByMediaId = async ({ to, mediaId, captionText }) => {
    const payload = {
        messaging_product: 'whatsapp',
        to,
        type: 'video',
        video: {
            id: mediaId,
            caption: captionText
        }
    };

    return axios.post(
        `${WHATSAPP_360DIALOG_API_URL.replace(/\/+$/, '')}/messages`,
        payload,
        {
            headers: {
                'D360-API-KEY': WHATSAPP_360DIALOG_API_KEY,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        }
    );
};

const sendVideoBufferTo360Dialog = async (mediaBuffer, to, fileName, sourceUrl = '') => {
    const safeFileName = String(fileName || 'video.mp4').trim() || 'video.mp4';
    const captionText = 'Посылочка идет на отправку. ‼️ Видео обязательно к просмотру ‼️ Обязательно сверьте свой заказ с содержимым коробки';
    const form = new FormData();
    form.append('file', mediaBuffer, {
        filename: safeFileName.endsWith('.mp4') ? safeFileName : `${safeFileName}.mp4`,
        contentType: 'video/mp4'
    });
    form.append('messaging_product', 'whatsapp');

    console.log('[WhatsApp outgoing] video_media_upload_request:', safeStringify({
        to,
        fileName: safeFileName,
        sourceUrlPreview: String(sourceUrl || '').slice(0, 120),
        size: mediaBuffer.length
    }));

    let uploadResponse;
    try {
        uploadResponse = await axios.post(
            `${WHATSAPP_360DIALOG_API_URL.replace(/\/+$/, '')}/media`,
            form,
            {
                headers: {
                    'D360-API-KEY': WHATSAPP_360DIALOG_API_KEY,
                    ...form.getHeaders()
                },
                maxBodyLength: Infinity,
                timeout: 60000
            }
        );
    } catch (error) {
        console.error('[WhatsApp outgoing] video_media_upload_failed:', safeStringify({
            to,
            fileName: safeFileName,
            size: mediaBuffer.length,
            status: error.response?.status || null,
            error: error.response?.data || error.message
        }));
        throw error;
    }
    const mediaId = String(uploadResponse?.data?.id || '').trim();
    if (!mediaId) {
        throw new Error('360dialog media upload did not return media id');
    }
    console.log('[WhatsApp outgoing] video_media_upload_success:', safeStringify({
        to,
        mediaId
    }));

    const retryDelaysMs = [0, 1200, 2500];
    let lastError = null;

    for (let index = 0; index < retryDelaysMs.length; index += 1) {
        const attempt = index + 1;
        const delayMs = retryDelaysMs[index];
        if (delayMs > 0) {
            await wait(delayMs);
        }

        try {
            console.log('[WhatsApp outgoing] video_message_send_attempt:', safeStringify({
                to,
                mediaId,
                attempt,
                delayMs
            }));
            const response = await send360DialogVideoMessageByMediaId({
                to,
                mediaId,
                captionText
            });
            console.log('Response from 360dialog (video by media id):', response.data);
            return response.data;
        } catch (error) {
            lastError = error;
            console.error('[WhatsApp outgoing] video_message_send_failed:', safeStringify({
                to,
                mediaId,
                attempt,
                status: error.response?.status || null,
                error: error.response?.data || error.message
            }));
            if (!is360DialogInvalidParameterError(error) || attempt >= retryDelaysMs.length) {
                throw error;
            }
        }
    }

    throw lastError || new Error('360dialog video send failed after retries');
};

const sendMessageByChatId = async (chatId, message) => {
    if (!chatId || !message) {
        return null;
    }

    const response = await sendNotification.sendToChatId(chatId, message, { enforce24h: true });
    console.log('Response from 360dialog (sendMessage):', response);
    return response;
};

const sendFileByUrlToChatId = async (chatId, urlFile, fileName, caption = '') => {
    if (!chatId || !urlFile) {
        return null;
    }

    const payload = {
        chatId,
        urlFile,
        fileName: fileName || `qr-${Date.now()}.png`,
        caption: String(caption || '')
    };

    try {
        const response = await axios.post(GREEN_API_SEND_FILE_URL, payload);
        console.log('Response from Green API (sendFileByUrl):', response.data);
        return response.data;
    } catch (error) {
        console.error('[WhatsApp webhook] sendFileByUrlToChatId failed:', {
            status: error.response?.status || null,
            data: error.response?.data || null,
            message: error.message,
            chatId,
            fileName,
            urlFilePreview: String(urlFile || '').slice(0, 120)
        });
        throw error;
    }
};

const buildCustomerPhoneCaptionByChatId = (chatId) => {
    const normalizedPhone = normalizePhoneNumber(chatId);
    if (normalizedPhone) {
        return `+7${normalizedPhone}`;
    }

    const digits = String(chatId || '').replace(/\D/g, '');
    if (digits.length >= 10) {
        return `+7${digits.slice(-10)}`;
    }

    return String(chatId || '').trim();
};

const startsWithPaymentRequest = (text) => {
    const normalized = String(text || '')
        .replace(/\u00A0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

    return normalized.startsWith('к оплате');
};

const startsWithKazpostCommand = (text) => {
    const normalized = String(text || '')
        .replace(/\u00A0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

    return normalized.startsWith('казпочта');
};

const stripKazpostCommandPrefix = (text) => {
    return String(text || '')
        .replace(/^\s*казпочта[\s:,-]*/i, '')
        .trim();
};

const startsWithOrderDraftHeader = (text) => {
    const firstLine = String(text || '')
        .split(/\r?\n/)
        .map((line) => String(line || '').trim())
        .find(Boolean);

    if (!firstLine) {
        return false;
    }

    const normalized = normalizeAlias(firstLine).replace(/\s*[:：]\s*$/, '');
    return normalized === 'ваш заказ';
};

const normalizeAlias = (value) =>
    String(value || '')
        .replace(/\u00A0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

const normalizePhoneToTenDigits = (value) => {
    const normalized = normalizePhoneNumber(value);
    if (normalized) {
        return normalized;
    }

    const digits = String(value || '').replace(/\D/g, '');
    if (digits.length >= 10) {
        return digits.slice(-10);
    }

    return '';
};

const cleanupKazpostCommandDedupe = () => {
    const now = Date.now();
    for (const [messageId, timestamp] of processedKazpostCommandByMessageId.entries()) {
        if (now - timestamp > KAZPOST_COMMAND_DEDUP_TTL_MS) {
            processedKazpostCommandByMessageId.delete(messageId);
        }
    }
};

const buildKazpostDeadlineAt = () => new Date(Date.now() + KAZPOST_REQUEST_TIMEOUT_MS);

const createKazpostRequestRecord = async ({
    messageId,
    customerPhone,
    customerChatId,
    sourceText
}) => {
    const basePayload = {
        customerPhone: customerPhone || null,
        customerChatId: customerChatId || null,
        sourceText: String(sourceText || '').trim(),
        processingStatus: 'received',
        deadlineAt: buildKazpostDeadlineAt(),
        lastError: null
    };

    if (messageId) {
        const [record] = await KazpostRequest.findOrCreate({
            where: { sourceMessageId: messageId },
            defaults: {
                sourceMessageId: messageId,
                ...basePayload
            }
        });

        const patch = {};
        if (!record.customerPhone && basePayload.customerPhone) {
            patch.customerPhone = basePayload.customerPhone;
        }
        if (!record.customerChatId && basePayload.customerChatId) {
            patch.customerChatId = basePayload.customerChatId;
        }
        if (!record.sourceText && basePayload.sourceText) {
            patch.sourceText = basePayload.sourceText;
        }
        if (!record.deadlineAt) {
            patch.deadlineAt = basePayload.deadlineAt;
        }
        if (Object.keys(patch).length > 0) {
            await record.update(patch);
        }
        return record;
    }

    return KazpostRequest.create(basePayload);
};

const markKazpostRequestProcessing = async (record, patch = {}) => {
    if (!record) {
        return null;
    }

    await record.update({
        processingStatus: 'processing',
        lastError: null,
        ...patch
    });

    return record;
};

const markKazpostRequestFailed = async (record, error) => {
    if (!record) {
        return null;
    }

    await record.update({
        processingStatus: 'error',
        lastError: formatErrorMessage(error)
    });

    return record;
};

const stringifyJson = (value) => {
    if (value === undefined || value === null) {
        return null;
    }

    try {
        return JSON.stringify(value);
    } catch (_error) {
        return null;
    }
};

const createOrGetOrderDraftRequestRecord = async ({
    messageId,
    customerPhone,
    customerChatId,
    sourceText
}) => {
    const payload = {
        customerPhone: customerPhone || null,
        customerChatId: customerChatId || null,
        sourceText: String(sourceText || '').trim(),
        processingStatus: 'received',
        lastError: null
    };

    if (messageId) {
        const [record] = await OrderDraftRequest.findOrCreate({
            where: { sourceMessageId: messageId },
            defaults: {
                sourceMessageId: messageId,
                ...payload
            }
        });

        const patch = {};
        if (!record.customerPhone && payload.customerPhone) {
            patch.customerPhone = payload.customerPhone;
        }
        if (!record.customerChatId && payload.customerChatId) {
            patch.customerChatId = payload.customerChatId;
        }
        if (!record.sourceText && payload.sourceText) {
            patch.sourceText = payload.sourceText;
        }
        if (Object.keys(patch).length > 0) {
            await record.update(patch);
        }

        return record;
    }

    return OrderDraftRequest.create(payload);
};

const markOrderDraftRequestFailed = async (record, error) => {
    if (!record) {
        return null;
    }

    await record.update({
        processingStatus: 'error',
        lastError: formatErrorMessage(error)
    });

    return record;
};

const markOrderDraftUnknownAliases = async (record, parsedDraft, unknownAliases) => {
    if (!record) {
        return null;
    }

    await record.update({
        parsedAliasesJson: stringifyJson(parsedDraft?.aliases || []),
        unknownAliasesJson: stringifyJson(unknownAliases || []),
        processingStatus: 'awaiting_alias_fix',
        lastError: unknownAliases && unknownAliases.length > 0 ? `Не найдены псевдонимы: ${unknownAliases.join(', ')}` : null
    });

    return record;
};

const markOrderDraftPaymentRequested = async (record, {
    parsedDraft,
    bundleCode,
    expectedAmount,
    paymentConnectionId
}) => {
    if (!record) {
        return null;
    }

    await record.update({
        parsedAliasesJson: stringifyJson(parsedDraft?.aliases || []),
        unknownAliasesJson: stringifyJson([]),
        bundleCode: bundleCode || null,
        expectedAmount: Number.isFinite(Number(expectedAmount)) ? Math.round(Number(expectedAmount)) : null,
        paymentConnectionId: paymentConnectionId || null,
        paymentRequestedAt: new Date(),
        processingStatus: 'awaiting_payment',
        lastError: null
    });

    return record;
};

const markOrderDraftPaid = async ({ bundleCode, connectionId, paidAt }) => {
    const where = {};
    if (bundleCode) {
        where.bundleCode = String(bundleCode || '').trim();
    } else if (connectionId) {
        where.paymentConnectionId = Number(connectionId);
    } else {
        return null;
    }

    const requestRecord = await OrderDraftRequest.findOne({
        where,
        order: [['createdAt', 'DESC']]
    });

    if (!requestRecord) {
        return null;
    }

    await requestRecord.update({
        paidAt: paidAt || new Date(),
        processingStatus: 'paid',
        lastError: null
    });

    return requestRecord;
};

const linkOrderDraftRequestToOrder = async ({ bundleCode, orderId, aiJsonText }) => {
    if (!bundleCode || !orderId) {
        return null;
    }

    const requestRecord = await OrderDraftRequest.findOne({
        where: {
            bundleCode: String(bundleCode || '').trim()
        },
        order: [['createdAt', 'DESC']]
    });

    if (!requestRecord) {
        return null;
    }

    await requestRecord.update({
        orderId,
        aiJsonText: aiJsonText || requestRecord.aiJsonText || null,
        processingStatus: requestRecord.paidAt ? 'paid' : 'awaiting_payment',
        lastError: null
    });

    return requestRecord;
};

const buildOrderDraftTextWithCorrections = (sourceText, corrections = []) => {
    const parsedDraft = parseOrderDraftMessage(sourceText);
    if (!parsedDraft) {
        throw new Error('Не удалось заново разобрать сообщение "Ваш заказ"');
    }

    const normalizedCorrections = corrections
        .map((item) => ({
            original: String(item?.original || '').trim(),
            replacement: String(item?.replacement || '').trim()
        }))
        .filter((item) => item.original || item.replacement);

    const replacementByOriginal = new Map();
    const extraAliases = [];

    normalizedCorrections.forEach((item) => {
        const normalizedOriginal = normalizeAlias(item.original);
        const normalizedReplacement = String(item.replacement || '').trim();

        if (!normalizedReplacement) {
            return;
        }

        if (!normalizedOriginal) {
            extraAliases.push({
                alias: normalizedReplacement,
                quantity: 1
            });
            return;
        }

        replacementByOriginal.set(normalizedOriginal, normalizedReplacement);
    });

    const aliasLines = parsedDraft.aliases
        .map((entry) => {
            const originalAlias = String(entry?.alias || '').trim();
            const quantity = Math.max(1, Math.floor(Number(entry?.quantity) || 1));
            const normalizedOriginal = normalizeAlias(originalAlias);
            const replacement = replacementByOriginal.get(normalizedOriginal) || originalAlias;
            return quantity > 1 ? `${replacement} ${quantity} шт` : replacement;
        });

    extraAliases.forEach((entry) => {
        aliasLines.push(entry.quantity > 1 ? `${entry.alias} ${entry.quantity} шт` : entry.alias);
    });

    const lines = [
        'Ваш заказ',
        ...aliasLines,
        `Доставка ${Math.round(Number(parsedDraft.deliveryPrice) || 0)}`,
        String(parsedDraft.noteText || '').trim()
    ].filter(Boolean);

    return lines.join('\n');
};

const parseJsonFromAiContent = (content) => {
    const raw = String(content || '').trim();
    if (!raw) {
        return null;
    }

    const fenced = raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    const jsonString = fenced && fenced[1] ? String(fenced[1]).trim() : raw;
    try {
        return JSON.parse(jsonString);
    } catch (_error) {
        return null;
    }
};

const splitAddressToOrderFields = (streetRaw) => {
    const cleaned = String(streetRaw || '')
        .replace(/\u00A0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!cleaned) {
        return {
            city: 'Не указан',
            street: 'Не указан',
            houseNumber: '1'
        };
    }

    const commaParts = cleaned
        .split(',')
        .map((part) => String(part || '').trim())
        .filter(Boolean);

    if (commaParts.length >= 2) {
        const city = commaParts[0] || 'Не указан';
        const houseNumber = commaParts[commaParts.length - 1] || '1';
        const street =
            commaParts.length > 2 ? commaParts.slice(1, -1).join(', ') : commaParts[1] || cleaned;

        return {
            city: city || 'Не указан',
            street: street || cleaned,
            houseNumber: houseNumber || '1'
        };
    }

    const tokens = cleaned.split(' ').filter(Boolean);
    const city = tokens[0] || 'Не указан';
    const houseNumber = tokens.length > 1 ? tokens[tokens.length - 1] : '1';
    const street = tokens.length > 2 ? tokens.slice(1, -1).join(' ') : cleaned;

    return {
        city: city || 'Не указан',
        street: street || cleaned,
        houseNumber: houseNumber || '1'
    };
};

const parseOrderClientDataByAi = async (noteText, fallbackChatId) => {
    if (!ORDER_DRAFT_AI_API_KEY) {
        throw new Error('OpenRouter API key не найден');
    }

    const normalizedNote = String(noteText || '').trim();
    if (!normalizedNote) {
        throw new Error('После строки "доставка" отсутствует текст с данными клиента');
    }

    const aiRequestBody = {
        model: ORDER_DRAFT_AI_MODEL,
        temperature: 0,
        messages: [
            {
                role: 'system',
                content: ORDER_DRAFT_AI_SYSTEM_PROMPT
            },
            {
                role: 'user',
                content: normalizedNote
            }
        ]
    };

    console.log('[WhatsApp webhook][AI] Preparing OpenRouter request:\n' + safeStringify({
        url: ORDER_DRAFT_AI_URL,
        model: ORDER_DRAFT_AI_MODEL,
        fallbackChatId,
        hasApiKey: Boolean(ORDER_DRAFT_AI_API_KEY),
        request: aiRequestBody
    }));

    let response;
    try {
        response = await axios.post(
            ORDER_DRAFT_AI_URL,
            aiRequestBody,
            {
                headers: {
                    Authorization: `Bearer ${ORDER_DRAFT_AI_API_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://greenman.kz',
                    'X-Title': 'Order Processor'
                },
                family: 4,
                httpsAgent: openRouterHttpsAgent,
                timeout: 30000
            }
        );
    } catch (error) {
        console.error('[WhatsApp webhook][AI] OpenRouter request failed:\n' + safeStringify({
            ...buildErrorDetails(error),
            status: error?.response?.status || error?.status || null,
            statusText: error?.response?.statusText || error?.statusText || null,
            responseData: error?.response?.data || null
        }));
        if (error?.response?.status === 401) {
            throw new Error(
                'OpenRouter вернул 401 Unauthorized. Проверьте актуальность OPENROUTER_API_KEY/ORDER_DRAFT_AI_API_KEY и аккаунт, к которому привязан этот ключ.'
            );
        }
        throw error;
    }

    console.log('[WhatsApp webhook][AI] OpenRouter raw response:\n' + safeStringify({
        status: response?.status,
        statusText: response?.statusText,
        data: response?.data
    }));

    const content = response?.data?.choices?.[0]?.message?.content;
    console.log('[WhatsApp webhook][AI] OpenRouter content:\n' + safeStringify({
        content
    }));
    const parsed = parseJsonFromAiContent(content);
    console.log('[WhatsApp webhook][AI] Parsed content JSON:\n' + safeStringify({
        parsed
    }));
    if (!parsed) {
        throw new Error('ИИ вернул невалидный JSON');
    }

    const customerName = String(parsed.kot || '').trim();
    const addressIndexMatch = String(parsed.user_input || '').replace(/\D/g, '').match(/\d{6}/);
    const addressIndex = addressIndexMatch ? addressIndexMatch[0] : '';
    const fullStreet = String(parsed.street || '').trim();
    const phoneNumber = normalizePhoneToTenDigits(parsed.number) || normalizePhoneToTenDigits(fallbackChatId);

    if (!customerName) {
        throw new Error('ИИ не вернул ФИО (kot)');
    }
    if (!addressIndex) {
        throw new Error('ИИ не вернул индекс (user_input)');
    }
    if (!fullStreet) {
        throw new Error('ИИ не вернул адрес (street)');
    }
    if (!phoneNumber || phoneNumber.length !== 10) {
        throw new Error('ИИ не вернул корректный телефон (number)');
    }

    const address = splitAddressToOrderFields(fullStreet);
    const aiJsonText = JSON.stringify({
        kot: customerName,
        user_input: addressIndex,
        street: fullStreet,
        number: phoneNumber
    });

    console.log('[WhatsApp webhook][AI] Normalized client fields from AI:\n' + safeStringify({
        customerName,
        addressIndex,
        city: address.city,
        street: address.street,
        houseNumber: address.houseNumber,
        phoneNumber
    }));

    return {
        customerName,
        addressIndex,
        city: address.city,
        street: address.street,
        houseNumber: address.houseNumber,
        phoneNumber,
        aiJsonText,
        aiRawText: String(content || '').trim()
    };
};

const createOrderFromOrderDraft = async ({
    resolvedItems,
    deliveryPrice,
    noteText,
    chatId,
    sellerAdmin
}) => {
    const decreasedStocks = [];

    try {
        console.log('[WhatsApp webhook][OrderDraft][Create] Start creating order from draft:\n' + safeStringify({
            chatId,
            deliveryPrice,
            noteText,
            resolvedItems
        }));
        const clientFields = await parseOrderClientDataByAi(noteText, chatId);
        const uniqueTypeIds = [...new Set(resolvedItems.map((item) => Number(item.typeId)).filter(Number.isFinite))];
        console.log('[WhatsApp webhook][OrderDraft][Create] Type ids selected:\n' + safeStringify({
            uniqueTypeIds
        }));
        const typeRows = await ProductType.findAll({
            where: {
                id: {
                    [Op.in]: uniqueTypeIds
                }
            }
        });
        const typeById = new Map(typeRows.map((row) => [Number(row.id), row]));
        console.log('[WhatsApp webhook][OrderDraft][Create] Type rows loaded:\n' + safeStringify({
            count: typeRows.length,
            ids: typeRows.map((row) => Number(row.id))
        }));

        const products = resolvedItems.map((item) => {
            const typeId = Number(item.typeId);
            const productId = Number(item.productId);
            const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
            const typeRow = typeById.get(typeId);

            if (!typeRow) {
                throw new Error(`Тип товара с ID ${typeId} не найден`);
            }

            if (Number(typeRow.productId) !== productId) {
                throw new Error(`Тип товара ${typeId} не принадлежит товару ${productId}`);
            }

            if (typeRow.stockQuantity !== null && Number(typeRow.stockQuantity) < quantity) {
                throw new Error(`Недостаточно остатка для типа ${typeId}`);
            }

            const itemUnitPrice = Number(item.unitPrice);
            const unitPrice = Number.isFinite(itemUnitPrice) && itemUnitPrice >= 0
                ? itemUnitPrice
                : Number(typeRow.price) || 0;

            return {
                productId,
                typeId,
                quantity,
                unitPrice
            };
        });
        console.log('[WhatsApp webhook][OrderDraft][Create] Normalized order products:\n' + safeStringify({
            products
        }));

        for (const item of products) {
            const typeRow = typeById.get(Number(item.typeId));
            if (!typeRow || typeRow.stockQuantity === null) {
                continue;
            }

            await typeRow.update({
                stockQuantity: Number(typeRow.stockQuantity) - item.quantity
            });

            decreasedStocks.push({
                typeId: Number(typeRow.id),
                quantity: item.quantity
            });
        }
        console.log('[WhatsApp webhook][OrderDraft][Create] Stock decreased for types:\n' + safeStringify({
            decreasedStocks
        }));

        const productsTotal = products.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
        const totalPrice = productsTotal + Math.max(0, Number(deliveryPrice) || 0);
        console.log('[WhatsApp webhook][OrderDraft][Create] Totals calculated:\n' + safeStringify({
            productsTotal,
            deliveryPrice: Math.max(0, Number(deliveryPrice) || 0),
            totalPrice
        }));

        const sellerIinFromSeller = normalizeAdminIinStrict(sellerAdmin?.iin);
        const sellerNameFromSeller = String(sellerAdmin?.fullName || '').trim();

        const orderPayload = {
            customerName: clientFields.customerName,
            addressIndex: clientFields.addressIndex,
            city: clientFields.city,
            street: clientFields.street,
            houseNumber: clientFields.houseNumber,
            phoneNumber: clientFields.phoneNumber,
            kaspiNumber: clientFields.phoneNumber,
            deliveryMethod: 'kazpost',
            paymentMethod: 'link',
            products: products.map((item) => ({
                productId: item.productId,
                typeId: item.typeId,
                quantity: item.quantity
            })),
            totalPrice,
            paymentSellerIin: sellerIinFromSeller || null,
            paymentSellerName: sellerNameFromSeller || null
        };
        console.log('[WhatsApp webhook][OrderDraft][Create] Initial order payload:\n' + safeStringify(orderPayload));

        const paymentLinkConnection = await attachRecentPaymentLinkToOrder(orderPayload, clientFields.phoneNumber);
        const orderPaymentLink = String(orderPayload.paymentLink || '').trim();
        const orderSellerIin = String(orderPayload.paymentSellerIin || '').replace(/\D/g, '');
        const orderSellerName = String(orderPayload.paymentSellerName || '').trim();

        if (!orderPaymentLink || orderSellerIin.length !== 12 || !orderSellerName) {
            throw new Error('Заказ со способом оплаты "link" нельзя создать без ссылки и администратора');
        }

        orderPayload.paymentLink = orderPaymentLink;
        orderPayload.paymentSellerIin = orderSellerIin;
        orderPayload.paymentSellerName = orderSellerName;
        console.log('[WhatsApp webhook][OrderDraft][Create] Payment connection attached:\n' + safeStringify({
            paymentConnectionId: paymentLinkConnection?.id || null,
            paymentConnectionIsPaid: paymentLinkConnection?.isPaid || false,
            paymentConnectionExpectedAmount: paymentLinkConnection?.expectedAmount || null,
            paymentConnectionPaidAmount: paymentLinkConnection?.paidAmount || null,
            finalOrderPayload: orderPayload
        }));
        if (canAutoMarkOrderAsPaidByConnection(paymentLinkConnection, totalPrice)) {
            orderPayload.status = 'Оплачено';
            console.log('[WhatsApp webhook][OrderDraft][Create] Order marked as paid by payment connection match');
        }

        const createdOrder = await Order.create(orderPayload);
        console.log('[WhatsApp webhook][OrderDraft][Create] Order row created:\n' + safeStringify({
            orderId: createdOrder.id,
            status: createdOrder.status,
            totalPrice: createdOrder.totalPrice
        }));
        if (paymentLinkConnection?.id) {
            const isLinked = await markPaymentLinkConnectionAsUsed(paymentLinkConnection.id, createdOrder.id);
            if (!isLinked) {
                await createdOrder.destroy();
                console.error('[WhatsApp webhook][OrderDraft][Create] Failed to link payment connection to created order, order rolled back:\n' + safeStringify({
                    paymentConnectionId: paymentLinkConnection.id,
                    createdOrderId: createdOrder.id
                }));
                throw new Error('Эта связь оплаты уже привязана к другому заказу');
            }
            console.log('[WhatsApp webhook][OrderDraft][Create] Payment connection linked to order:\n' + safeStringify({
                paymentConnectionId: paymentLinkConnection.id,
                orderId: createdOrder.id
            }));
        }

        try {
            await sendMessageToChannel(createdOrder);
            console.log(`[WhatsApp webhook][OrderDraft][Create] Order #${createdOrder.id} notification sent to channel`);
        } catch (_error) {
            // Не блокируем создание заказа, если уведомление в канал не отправилось.
            console.log(`[WhatsApp webhook][OrderDraft][Create] Order #${createdOrder.id} notification to channel failed, ignored`);
        }

        console.log('[WhatsApp webhook][OrderDraft][Create] Finished successfully:\n' + safeStringify({
            orderId: createdOrder.id
        }));
        return {
            order: createdOrder,
            aiJsonText: clientFields.aiJsonText
        };
    } catch (error) {
        console.error('[WhatsApp webhook][OrderDraft][Create] Failed with error:\n' + safeStringify({
            message: error?.message || null,
            stack: error?.stack || null
        }));
        if (decreasedStocks.length > 0) {
            await Promise.all(
                decreasedStocks.map(async (item) => {
                    const typeRow = await ProductType.findByPk(item.typeId);
                    if (!typeRow || typeRow.stockQuantity === null) {
                        return;
                    }

                    await typeRow.update({
                        stockQuantity: Number(typeRow.stockQuantity) + item.quantity
                    });
                })
            );
            console.log('[WhatsApp webhook][OrderDraft][Create] Restored decreased stocks after failure:\n' + safeStringify({
                decreasedStocks
            }));
        }

        throw error;
    }
};

const buildKazpostOrderPayload = async ({
    clientFields,
    recipientPhone,
    recipientChatId
}) => {
    const typeRow = await ProductType.findByPk(KAZPOST_COMMAND_TYPE_ID);
    if (!typeRow) {
        throw new Error(`Тип товара с ID ${KAZPOST_COMMAND_TYPE_ID} не найден`);
    }
    if (Number(typeRow.productId) !== KAZPOST_COMMAND_PRODUCT_ID) {
        throw new Error(
            `Тип товара ${KAZPOST_COMMAND_TYPE_ID} не принадлежит товару ${KAZPOST_COMMAND_PRODUCT_ID}`
        );
    }

    const unitPrice = Math.max(0, Number(typeRow.price) || 0);
    const orderPayload = {
        customerName: clientFields.customerName,
        addressIndex: clientFields.addressIndex,
        city: clientFields.city,
        street: clientFields.street,
        houseNumber: clientFields.houseNumber,
        phoneNumber: clientFields.phoneNumber,
        kaspiNumber: clientFields.phoneNumber,
        deliveryMethod: 'kazpost',
        paymentMethod: 'link',
        products: [
            {
                productId: KAZPOST_COMMAND_PRODUCT_ID,
                typeId: KAZPOST_COMMAND_TYPE_ID,
                quantity: 1
            }
        ],
        totalPrice: unitPrice
    };

    let paymentLinkConnection = await SentPaymentLink.findOne({
        where: {
            customerPhone: recipientPhone,
            linkedOrderId: null
        },
        order: [['receivedAt', 'DESC']]
    });

    if (paymentLinkConnection) {
        orderPayload.paymentLink = String(paymentLinkConnection.paymentLink || '').trim() || null;
        if (paymentLinkConnection.sellerIin) {
            orderPayload.paymentSellerIin = String(paymentLinkConnection.sellerIin);
        }
        if (paymentLinkConnection.sellerAdminName) {
            orderPayload.paymentSellerName = String(paymentLinkConnection.sellerAdminName);
        }
    }

    const ivanAdmin = await getAdminByPhone(KAZPOST_FALLBACK_ADMIN_PHONE);
    const ivanSellerIin = String(normalizeAdminIin(ivanAdmin?.iin) || '').replace(/\D/g, '');
    const ivanSellerName = String(ivanAdmin?.fullName || 'Иван').trim();

    if (!paymentLinkConnection) {
        const ivanPaymentLink = await PaymentLink.findOne({
            where: {
                adminPhone: KAZPOST_FALLBACK_ADMIN_PHONE,
                isActive: true
            },
            order: [['id', 'DESC']]
        });

        if (ivanPaymentLink) {
            orderPayload.paymentLink = String(ivanPaymentLink.url || '').trim() || null;
            paymentLinkConnection = await SentPaymentLink.create({
                customerPhone: recipientPhone,
                customerChatId: String(recipientChatId || '').trim() || `${recipientPhone}@c.us`,
                paymentLink: orderPayload.paymentLink,
                sourceDescription: '[Kazpost fallback] Auto-attached Ivan payment link',
                expectedAmount: Math.round(unitPrice),
                sellerIin: ivanSellerIin || null,
                sellerAdminPhone: KAZPOST_FALLBACK_ADMIN_PHONE,
                sellerAdminName: ivanSellerName || null
            });
        }
    }

    if (!orderPayload.paymentSellerIin && ivanSellerIin) {
        orderPayload.paymentSellerIin = ivanSellerIin;
    }
    if (!orderPayload.paymentSellerName && ivanSellerName) {
        orderPayload.paymentSellerName = ivanSellerName;
    }

    const orderPaymentLink = String(orderPayload.paymentLink || '').trim();
    const orderSellerIin = String(orderPayload.paymentSellerIin || '').replace(/\D/g, '');
    const orderSellerName = String(orderPayload.paymentSellerName || '').trim();

    if (!orderPaymentLink || orderSellerIin.length !== 12 || !orderSellerName) {
        throw new Error('Заказ со способом оплаты "link" нельзя создать без ссылки и администратора');
    }

    orderPayload.paymentLink = orderPaymentLink;
    orderPayload.paymentSellerIin = orderSellerIin;
    orderPayload.paymentSellerName = orderSellerName;

    return {
        typeRow,
        unitPrice,
        orderPayload,
        paymentLinkConnection
    };
};

const createOrUpdateKazpostOrder = async ({
    clientFields,
    recipientPhone,
    recipientChatId,
    existingOrderId = null
}) => {
    const { typeRow, orderPayload, paymentLinkConnection } = await buildKazpostOrderPayload({
        clientFields,
        recipientPhone,
        recipientChatId
    });

    const existingOrder = existingOrderId ? await Order.findByPk(existingOrderId) : null;

    if (existingOrder) {
        await existingOrder.update({
            ...orderPayload,
            trackingNumber: existingOrder.trackingNumber
        });

        if (paymentLinkConnection?.id && !paymentLinkConnection.linkedOrderId) {
            await markPaymentLinkConnectionAsUsed(paymentLinkConnection.id, existingOrder.id).catch(() => false);
        }

        return {
            order: existingOrder,
            action: 'updated'
        };
    }

    if (typeRow.stockQuantity !== null && Number(typeRow.stockQuantity) < 1) {
        throw new Error(`Недостаточно остатка для типа ${KAZPOST_COMMAND_TYPE_ID}`);
    }

    let stockDecreased = false;
    try {
        if (typeRow.stockQuantity !== null) {
            await typeRow.update({
                stockQuantity: Number(typeRow.stockQuantity) - 1
            });
            stockDecreased = true;
        }

        const createdOrder = await Order.create(orderPayload);
        if (paymentLinkConnection?.id) {
            const isLinked = await markPaymentLinkConnectionAsUsed(paymentLinkConnection.id, createdOrder.id);
            if (!isLinked) {
                await createdOrder.destroy();
                throw new Error('Эта связь оплаты уже привязана к другому заказу');
            }
        }

        try {
            await sendMessageToChannel(createdOrder);
            console.log(`[WhatsApp webhook][Kazpost] Order #${createdOrder.id} notification sent to channel`);
        } catch (_error) {
            console.log(`[WhatsApp webhook][Kazpost] Order #${createdOrder.id} notification failed, ignored`);
        }

        return {
            order: createdOrder,
            action: 'created'
        };
    } catch (error) {
        if (stockDecreased) {
            const freshTypeRow = await ProductType.findByPk(KAZPOST_COMMAND_TYPE_ID);
            if (freshTypeRow && freshTypeRow.stockQuantity !== null) {
                await freshTypeRow.update({
                    stockQuantity: Number(freshTypeRow.stockQuantity) + 1
                });
            }
        }
        throw error;
    }
};

const processKazpostRequest = async ({
    textMessage,
    recipientChatId,
    recipientPhoneRaw,
    messageId,
    requestRecord = null,
    incrementRetry = false
}) => {
    if (messageId) {
        cleanupKazpostCommandDedupe();
        if (processedKazpostCommandByMessageId.has(messageId) && !requestRecord) {
            console.log(`[WhatsApp webhook][Kazpost] Duplicate message ignored by messageId=${messageId}`);
            return null;
        }
    }

    const recipientPhone = normalizePhoneToTenDigits(recipientPhoneRaw || recipientChatId);
    const kazpostRequest =
        requestRecord ||
        (await createKazpostRequestRecord({
            messageId,
            customerPhone: recipientPhone || normalizePhoneToTenDigits(recipientPhoneRaw) || null,
            customerChatId: recipientChatId,
            sourceText: textMessage
        }));

    if (!recipientPhone || recipientPhone.length !== 10) {
        const phoneError = new Error('Не удалось определить номер телефона получателя');
        await markKazpostRequestFailed(kazpostRequest, phoneError);
        console.log('[WhatsApp webhook][Kazpost] Skip: recipient phone not detected');
        throw phoneError;
    }

    if (kazpostRequest.orderId && !incrementRetry) {
        const existingOrder = await Order.findByPk(kazpostRequest.orderId);
        if (existingOrder) {
            if (messageId) {
                processedKazpostCommandByMessageId.set(messageId, Date.now());
            }
            console.log(`[WhatsApp webhook][Kazpost] Existing order reused for request #${kazpostRequest.id}`);
            return existingOrder;
        }
    }

    const commandBody = stripKazpostCommandPrefix(textMessage);
    const aiInput = `${commandBody}\nТелефон получателя: ${recipientPhone}`.trim();

    await markKazpostRequestProcessing(kazpostRequest, {
        customerPhone: recipientPhone,
        customerChatId: recipientChatId || kazpostRequest.customerChatId || null,
        sourceText: String(textMessage || '').trim(),
        aiInputText: aiInput,
        deadlineAt: buildKazpostDeadlineAt(),
        ...(incrementRetry ? { retryCount: Number(kazpostRequest.retryCount || 0) + 1 } : {})
    });

    try {
        const clientFields = await parseOrderClientDataByAi(aiInput, recipientChatId);
        await kazpostRequest.update({
            aiResponseText: clientFields.aiRawText || null,
            aiJsonText: clientFields.aiJsonText || null,
            aiProcessedAt: new Date(),
            processingStatus: 'ai_processed',
            lastError: null
        });

        const orderMeta = await createOrUpdateKazpostOrder({
            clientFields,
            recipientPhone,
            recipientChatId,
            existingOrderId: kazpostRequest.orderId || null
        });

        await kazpostRequest.update({
            customerPhone: clientFields.phoneNumber || recipientPhone,
            orderId: orderMeta.order.id,
            orderLinkedAt: new Date(),
            processingStatus: 'order_created',
            lastError: null
        });

        if (messageId) {
            processedKazpostCommandByMessageId.set(messageId, Date.now());
        }

        console.log('[WhatsApp webhook][Kazpost] Order linked to request:\n' + safeStringify({
            requestId: kazpostRequest.id,
            messageId,
            orderId: orderMeta.order.id,
            action: orderMeta.action,
            recipientChatId,
            recipientPhone
        }));

        return orderMeta.order;
    } catch (error) {
        await markKazpostRequestFailed(kazpostRequest, error);
        throw error;
    }
};

const createOrderFromKazpostOutgoingCommand = async ({
    textMessage,
    recipientChatId,
    recipientPhoneRaw,
    messageId
}) =>
    processKazpostRequest({
        textMessage,
        recipientChatId,
        recipientPhoneRaw,
        messageId
    });

const retryKazpostRequestProcessing = async ({
    requestId,
    sourceText
}) => {
    const requestRecord = await KazpostRequest.findByPk(requestId);
    if (!requestRecord) {
        throw new Error('Запись казпочты не найдена');
    }

    const nextSourceText = String(sourceText || requestRecord.sourceText || '').trim();
    if (!startsWithKazpostCommand(nextSourceText)) {
        throw new Error('Текст должен начинаться со слова "казпочта"');
    }

    return processKazpostRequest({
        textMessage: nextSourceText,
        recipientChatId: String(requestRecord.customerChatId || '').trim(),
        recipientPhoneRaw: requestRecord.customerPhone,
        messageId: requestRecord.sourceMessageId || null,
        requestRecord,
        incrementRetry: true
    });
};

const retryOrderDraftRequestProcessing = async ({
    requestId,
    corrections = [],
    sourceText = ''
}) => {
    const requestRecord = await OrderDraftRequest.findByPk(requestId);
    if (!requestRecord) {
        throw new Error('Запись "Ваш заказ" не найдена');
    }

    const sourceBaseText = String(sourceText || '').trim() || String(requestRecord.sourceText || '').trim();
    const nextSourceText = buildOrderDraftTextWithCorrections(sourceBaseText, corrections);
    const analyzedDraft = analyzeOrderDraftMessage(nextSourceText);
    if (!analyzedDraft.parsed) {
        throw new Error(analyzedDraft.error || 'Не удалось обработать исправленное сообщение "Ваш заказ"');
    }

    await requestRecord.update({
        sourceText: nextSourceText,
        unknownAliasesJson: null,
        lastError: null,
        processingStatus: 'retry_processing',
        retryCount: Number(requestRecord.retryCount || 0) + 1
    });

    await processOrderDraftRequest({
        textMessage: nextSourceText,
        recipientChatId: String(requestRecord.customerChatId || '').trim(),
        parsedOrderDraft: analyzedDraft.parsed,
        orderDraftRequest: requestRecord
    });

    return requestRecord.reload();
};

const buildBundleNoteText = (noteText, chatId) => {
    const normalizedNote = String(noteText || '').trim();
    const normalizedPhone = normalizePhoneNumber(chatId);
    const phoneLine = normalizedPhone ? `Телефон: ${normalizedPhone}` : `Телефон: ${String(chatId || '').trim()}`;

    if (!normalizedNote) {
        return phoneLine;
    }

    return `${normalizedNote}\n${phoneLine}`;
};

const buildOrderDraftSourceDescription = ({ sourceText, bundleCode, totalToPay }) => {
    const payload = {
        v: 1,
        bundleCode: String(bundleCode || '').trim(),
        totalToPay: Number.isFinite(Number(totalToPay)) ? Math.round(Number(totalToPay)) : null
    };

    return `${ORDER_DRAFT_SOURCE_PREFIX}${JSON.stringify(payload)}\n${String(sourceText || '').trim()}`;
};

const parseOrderDraftSourceMeta = (sourceDescription) => {
    const raw = String(sourceDescription || '');
    if (!raw.startsWith(ORDER_DRAFT_SOURCE_PREFIX)) {
        return null;
    }

    const payloadLine = raw.split('\n')[0].slice(ORDER_DRAFT_SOURCE_PREFIX.length).trim();
    if (!payloadLine) {
        return null;
    }

    try {
        const payload = JSON.parse(payloadLine);
        const bundleCode = String(payload?.bundleCode || '').trim();
        if (!bundleCode) {
            return null;
        }
        const totalToPay = Number(payload?.totalToPay);
        return {
            bundleCode,
            totalToPay: Number.isFinite(totalToPay) ? Math.round(totalToPay) : null
        };
    } catch (_error) {
        return null;
    }
};

const isSameRoundedAmount = (left, right) => {
    const a = Number(left);
    const b = Number(right);
    return Number.isFinite(a) && Number.isFinite(b) && Math.round(a) === Math.round(b);
};

const prunePendingOrderDrafts = () => {
    const now = Date.now();
    pendingOrderDraftByChatId.forEach((value, key) => {
        if (!value || now - Number(value.createdAt || 0) > ORDER_DRAFT_TTL_MS) {
            pendingOrderDraftByChatId.delete(key);
        }
    });
};

const setPendingOrderDraft = (chatId, payload) => {
    const normalizedChatId = String(chatId || '').trim();
    if (!normalizedChatId || !payload) {
        return;
    }
    prunePendingOrderDrafts();
    pendingOrderDraftByChatId.set(normalizedChatId, {
        ...payload,
        createdAt: Date.now()
    });
};

const getPendingOrderDraftIfMatches = (chatId, expectedAmount) => {
    const normalizedChatId = String(chatId || '').trim();
    if (!normalizedChatId) {
        return null;
    }

    prunePendingOrderDrafts();
    const pending = pendingOrderDraftByChatId.get(normalizedChatId);
    if (!pending) {
        return null;
    }

    const pendingTotal = Number(pending.totalToPay);
    const requestedAmount = Number(expectedAmount);
    const isAmountMatches =
        Number.isFinite(pendingTotal) &&
        Number.isFinite(requestedAmount) &&
        Math.round(pendingTotal) === Math.round(requestedAmount);

    if (!isAmountMatches) {
        return null;
    }

    return pending;
};

const findRecentUnpaidPaymentConnection = async ({
    customerChatId,
    paymentLink,
    expectedAmount,
    matchAnyAmount = false
}) => {
    const chatId = String(customerChatId || '').trim();
    if (!chatId) {
        return null;
    }

    const rows = await SentPaymentLink.findAll({
        where: {
            customerChatId: chatId,
            isPaid: false
        },
        order: [['receivedAt', 'DESC']],
        limit: 15
    });

    const now = Date.now();
    for (const row of rows) {
        const rowJson = row.toJSON();
        const receivedAtMs = new Date(rowJson.receivedAt).getTime();
        const isRecent = Number.isFinite(receivedAtMs) && now - receivedAtMs <= PAYMENT_LINK_DUPLICATE_WINDOW_MS;
        const isSameLink = String(rowJson.paymentLink || '').trim() === String(paymentLink || '').trim();
        const isSameAmount = matchAnyAmount
            ? true
            : expectedAmount === null
                ? rowJson.expectedAmount === null || rowJson.expectedAmount === undefined
                : isSameRoundedAmount(rowJson.expectedAmount, expectedAmount);

        if (isRecent && isSameLink && isSameAmount) {
            return row;
        }
    }

    return null;
};

const sendPlannedPaymentLinkAndTrack = async ({
    recipientChatId,
    expectedAmount,
    sourceDescription,
    messageId
}) => {
    const plannedLink = await pickNextPaymentLinkByDispatchPlan();
    if (!plannedLink) {
        console.log('[WhatsApp webhook] Payment request detected, but there are no links from dispatch plan.');
        return null;
    }

    const customerPhone = normalizePhoneNumber(recipientChatId);
    if (!customerPhone) {
        return null;
    }

    const duplicateRecentConnection = await findRecentUnpaidPaymentConnection({
        customerChatId: recipientChatId,
        paymentLink: plannedLink.url,
        expectedAmount
    });
    if (duplicateRecentConnection) {
        const duplicateJson = duplicateRecentConnection.toJSON();
        const hasBundleMeta = Boolean(parseOrderDraftSourceMeta(duplicateJson.sourceDescription)?.bundleCode);
        const hasIncomingBundleMeta = Boolean(parseOrderDraftSourceMeta(sourceDescription)?.bundleCode);
        if (hasIncomingBundleMeta && !hasBundleMeta) {
            await duplicateRecentConnection.update({ sourceDescription });
            console.log(
                `[WhatsApp webhook][OrderDraft] Reused recent connection #${duplicateJson.id} and attached deferred bundle metadata.`
            );
        } else {
            console.log(
                `[WhatsApp webhook] Duplicate payment connection prevented: reused #${duplicateJson.id} for ${customerPhone}.`
            );
        }
        return duplicateRecentConnection;
    }

    console.log(`[WhatsApp webhook] Sending planned payment link to ${recipientChatId}: ${plannedLink.url}`);
    await sendMessageByChatId(recipientChatId, `${plannedLink.url}\n${PAYMENT_LINK_FOOTER}`);

    if (messageId) {
        const [savedLink, created] = await SentPaymentLink.findOrCreate({
            where: { messageId },
            defaults: {
                messageId,
                customerPhone,
                customerChatId: recipientChatId,
                paymentLink: plannedLink.url,
                sourceDescription,
                expectedAmount
            }
        });

        if (created) {
            console.log(`[WhatsApp webhook] Planned payment link sent and saved by messageId ${messageId}: ${customerPhone} = ${plannedLink.url}`);
        } else {
            console.log(`[WhatsApp webhook] Duplicate messageId ${messageId}, planned payment link was already processed.`);
            if (parseOrderDraftSourceMeta(sourceDescription)?.bundleCode && !parseOrderDraftSourceMeta(savedLink.sourceDescription)?.bundleCode) {
                await savedLink.update({ sourceDescription });
                console.log(`[WhatsApp webhook][OrderDraft] Added deferred bundle metadata to existing messageId ${messageId}.`);
            }
        }

        return savedLink;
    }

    const saved = await SentPaymentLink.create({
        customerPhone,
        customerChatId: recipientChatId,
        paymentLink: plannedLink.url,
        sourceDescription,
        expectedAmount
    });
    console.log(`[WhatsApp webhook] Planned payment link sent and saved: ${customerPhone} = ${saved.paymentLink}`);
    return saved;
};

const parseAliasLineWithQuantity = (line) => {
    const cleanedLine = String(line || '')
        .replace(/^[\s\-•*]+/, '')
        .trim();

    if (!cleanedLine) {
        return null;
    }

    const quantityMatch = cleanedLine.match(/^(.*?)(\d+)\s*шт\.?$/i);
    if (!quantityMatch) {
        return {
            alias: cleanedLine,
            quantity: 1
        };
    }

    const alias = String(quantityMatch[1] || '').trim();
    const parsedQuantity = Number.parseInt(quantityMatch[2], 10);
    const quantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 1;

    if (!alias) {
        return null;
    }

    return {
        alias,
        quantity
    };
};

const analyzeOrderDraftMessage = (text) => {
    const rawText = String(text || '');
    console.log(`[WhatsApp webhook][OrderDraft] Raw text received (${rawText.length} chars)`);
    if (!rawText) {
        console.log('[WhatsApp webhook][OrderDraft] Skip: empty text');
        return {
            parsed: null,
            error: 'Текст сообщения пустой.'
        };
    }

    const lines = rawText
        .split(/\r?\n/)
        .map((line) => String(line || '').trim())
        .filter((line) => line.length > 0);

    if (lines.length < 3) {
        console.log(`[WhatsApp webhook][OrderDraft] Skip: not enough lines (${lines.length})`);
        return {
            parsed: null,
            error: `Недостаточно строк в сообщении: ${lines.length}. Нужны заголовок, товары, доставка и данные клиента.`
        };
    }

    const firstLineNormalized = normalizeAlias(lines[0]).replace(/\s*[:：]\s*$/, '');
    if (firstLineNormalized !== 'ваш заказ') {
        console.log(
            `[WhatsApp webhook][OrderDraft] Skip: first line is not "Ваш заказ" (got "${lines[0]}")`
        );
        return {
            parsed: null,
            error: `Первая строка должна быть "Ваш заказ", сейчас там: "${lines[0]}".`
        };
    }

    const deliveryLineIndex = lines.findIndex((line, index) => {
        if (index === 0) {
            return false;
        }
        return /^доставка\s+[0-9][0-9\s]*/i.test(line);
    });

    if (deliveryLineIndex < 1) {
        console.log('[WhatsApp webhook][OrderDraft] Skip: delivery line not found');
        return {
            parsed: null,
            error: 'Не найдена строка доставки. Добавьте строку вида "Доставка 1500".'
        };
    }

    const deliveryLine = lines[deliveryLineIndex];
    const deliveryMatch = deliveryLine.match(/^доставка\s+([0-9][0-9\s]*)/i);
    if (!deliveryMatch || !deliveryMatch[1]) {
        console.log(
            `[WhatsApp webhook][OrderDraft] Skip: delivery line does not match pattern (got "${deliveryLine}")`
        );
        return {
            parsed: null,
            error: `Строка доставки заполнена неверно: "${deliveryLine}". Используйте формат "Доставка 1500".`
        };
    }

    const deliveryPrice = Number.parseInt(deliveryMatch[1].replace(/\s+/g, ''), 10);
    if (!Number.isFinite(deliveryPrice) || deliveryPrice < 0) {
        console.log(
            `[WhatsApp webhook][OrderDraft] Skip: invalid delivery price parsed from "${deliveryLine}"`
        );
        return {
            parsed: null,
            error: `Не удалось определить стоимость доставки из строки "${deliveryLine}".`
        };
    }

    const aliasEntries = lines
        .slice(1, deliveryLineIndex)
        .map(parseAliasLineWithQuantity)
        .filter(Boolean);

    if (aliasEntries.length === 0) {
        console.log('[WhatsApp webhook][OrderDraft] Skip: aliases list is empty');
        return {
            parsed: null,
            error: 'Не найдено ни одного товара в блоке заказа.'
        };
    }

    const noteText = lines
        .slice(deliveryLineIndex + 1)
        .map((line) => String(line || '').trim())
        .filter(Boolean)
        .join('\n');

    if (!noteText) {
        console.log('[WhatsApp webhook][OrderDraft] Skip: note text is empty');
        return {
            parsed: null,
            error: 'После строки доставки нет данных клиента для трек-номера.'
        };
    }

    console.log(
        `[WhatsApp webhook][OrderDraft] Parsed successfully: aliases=${aliasEntries.length}, delivery=${deliveryPrice}, noteLength=${noteText.length}`
    );
    console.log('[WhatsApp webhook][OrderDraft] Aliases:', aliasEntries);

    return {
        parsed: {
            aliases: aliasEntries,
            deliveryPrice,
            noteText
        },
        error: null
    };
};

const parseOrderDraftMessage = (text) => analyzeOrderDraftMessage(text).parsed;

const resolveOrderAliases = async (aliases) => {
    console.log(`[WhatsApp webhook][OrderDraft] Resolving aliases, count=${aliases.length}`);
    const aliasToRequestedCount = new Map();
    aliases.forEach((aliasEntry) => {
        const normalized = normalizeAlias(aliasEntry?.alias);
        const parsedQuantity = Number(aliasEntry?.quantity);
        const quantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0
            ? Math.floor(parsedQuantity)
            : 1;

        if (!normalized) {
            return;
        }
        aliasToRequestedCount.set(normalized, (aliasToRequestedCount.get(normalized) || 0) + quantity);
    });

    console.log(
        `[WhatsApp webhook][OrderDraft] Unique aliases to resolve=${aliasToRequestedCount.size}`
    );

    const knownTypes = await ProductType.findAll({
        where: {
            alias: {
                [Op.not]: null
            }
        },
        include: [{ model: Product, attributes: ['id', 'name'] }]
    });

    const typeByAlias = new Map();
    knownTypes.forEach((typeItem) => {
        const normalized = normalizeAlias(typeItem.alias);
        if (!normalized || typeByAlias.has(normalized)) {
            return;
        }
        typeByAlias.set(normalized, typeItem);
    });

    console.log(
        `[WhatsApp webhook][OrderDraft] Known aliases in DB=${typeByAlias.size}`
    );

    const unknownAliases = [];
    const items = [];

    aliasToRequestedCount.forEach((quantity, normalizedAlias) => {
        const typeRecord = typeByAlias.get(normalizedAlias);
        if (!typeRecord) {
            unknownAliases.push(normalizedAlias);
            return;
        }

        const typeJson = typeRecord.toJSON();
        console.log(
            `[WhatsApp webhook][OrderDraft] Alias resolved: "${normalizedAlias}" -> productId=${typeJson.productId}, typeId=${typeJson.id}, qty=${quantity}, price=${typeJson.price}`
        );
        items.push({
            productId: Number(typeJson.productId),
            typeId: Number(typeJson.id),
            quantity: Math.max(1, Number(quantity) || 1),
            alias: String(typeJson.alias || ''),
            productName: String(typeJson.product?.name || ''),
            typeName: String(typeJson.type || ''),
            unitPrice: Number(typeJson.price) || 0
        });
    });

    return {
        items,
        unknownAliases
    };
};

const processOrderDraftRequest = async ({
    textMessage,
    recipientChatId,
    parsedOrderDraft,
    orderDraftRequest = null
}) => {
    console.log(
        `[WhatsApp webhook] Order draft detected. chatId=${recipientChatId}, aliases=${parsedOrderDraft.aliases.length}, delivery=${parsedOrderDraft.deliveryPrice}`
    );

    const resolved = await resolveOrderAliases(parsedOrderDraft.aliases);
    console.log(
        `[WhatsApp webhook][OrderDraft] Resolve result: items=${resolved.items.length}, unknown=${resolved.unknownAliases.length}`
    );

    if (resolved.unknownAliases.length > 0) {
        console.log(
            `[WhatsApp webhook][OrderDraft] Unknown aliases found: ${resolved.unknownAliases.join(', ')}`
        );
        await markOrderDraftUnknownAliases(orderDraftRequest, parsedOrderDraft, resolved.unknownAliases);
        await sendMessageByChatId(
            recipientChatId,
            `Не найдены псевдонимы: ${resolved.unknownAliases.join(', ')}`
        );
        console.log('[WhatsApp webhook][OrderDraft] Sent unknown aliases message to chat');
        return null;
    }

    if (resolved.items.length === 0) {
        console.log('[WhatsApp webhook][OrderDraft] Resolved items are empty, notifying chat');
        await markOrderDraftRequestFailed(orderDraftRequest, 'Список товаров после разбора оказался пустым');
        await sendMessageByChatId(recipientChatId, 'Не удалось собрать заказ: список товаров пуст.');
        return null;
    }

    const productsTotal = resolved.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const totalToPay = productsTotal + parsedOrderDraft.deliveryPrice;
    console.log(
        `[WhatsApp webhook][OrderDraft] Totals: products=${productsTotal}, delivery=${parsedOrderDraft.deliveryPrice}, total=${totalToPay}`
    );

    const bundlePayload = {
        v: 1,
        deliveryPrice: parsedOrderDraft.deliveryPrice,
        noteText: buildBundleNoteText(parsedOrderDraft.noteText, recipientChatId),
        items: resolved.items.map((item) => ({
            productId: item.productId,
            typeId: item.typeId,
            quantity: item.quantity,
            unitPrice: item.unitPrice
        }))
    };

    const bundleRow = await saveOrderBundle(bundlePayload);
    const bundleCode = String(bundleRow.code || '').trim();
    console.log(
        `[WhatsApp webhook][OrderDraft] Bundle saved: id=${bundleRow.id}, codeLength=${bundleCode.length}`
    );

    setPendingOrderDraft(recipientChatId, {
        bundleCode,
        totalToPay,
        sourceText: textMessage
    });
    console.log('[WhatsApp webhook][OrderDraft] Deferred QR saved in pending map');
    console.log('[WhatsApp webhook][OrderDraft] Sending total-to-pay message...');
    await sendMessageByChatId(recipientChatId, `К оплате ${totalToPay}`);
    console.log('[WhatsApp webhook][OrderDraft] Total-to-pay message sent');
    const orderDraftPaymentSource = buildOrderDraftSourceDescription({
        sourceText: `К оплате ${totalToPay}`,
        bundleCode,
        totalToPay
    });
    const sentPaymentConnection = await sendPlannedPaymentLinkAndTrack({
        recipientChatId,
        expectedAmount: totalToPay,
        sourceDescription: orderDraftPaymentSource,
        messageId: null
    });
    await markOrderDraftPaymentRequested(orderDraftRequest, {
        parsedDraft: parsedOrderDraft,
        bundleCode,
        expectedAmount: totalToPay,
        paymentConnectionId: sentPaymentConnection?.id || null
    });
    if (sentPaymentConnection) {
        pendingOrderDraftByChatId.delete(recipientChatId);
        console.log('[WhatsApp webhook][OrderDraft] Planned payment link sent immediately after total-to-pay message');
    }

    console.log(
        `[WhatsApp webhook] Order draft accepted. QR deferred until payment. chatId=${recipientChatId}, items=${resolved.items.length}, total=${totalToPay}`
    );

    return {
        bundleCode,
        totalToPay,
        sentPaymentConnectionId: sentPaymentConnection?.id || null
    };
};

const generateOrderBundleCode = (length = 10) => {
    let result = '';
    for (let index = 0; index < length; index += 1) {
        const randomIndex = Math.floor(Math.random() * ORDER_BUNDLE_CODE_ALPHABET.length);
        result += ORDER_BUNDLE_CODE_ALPHABET[randomIndex];
    }
    return `ob_${result}`;
};

const saveOrderBundle = async (bundlePayload) => {
    const serialized = JSON.stringify(bundlePayload);

    for (let attempt = 0; attempt < 8; attempt += 1) {
        const code = generateOrderBundleCode();
        try {
            const row = await OrderBundle.create({
                code,
                payload: serialized
            });

            return row;
        } catch (error) {
            if (error?.name === 'SequelizeUniqueConstraintError') {
                continue;
            }

            throw error;
        }
    }

    throw new Error('Не удалось сгенерировать уникальный код QR-пакета заказа');
};

const parseOrderBundlePayload = (rawPayload) => {
    let parsedPayload;
    try {
        parsedPayload = JSON.parse(String(rawPayload || '{}'));
    } catch (_error) {
        throw new Error('QR-пакет заказа содержит невалидный JSON');
    }

    const items = Array.isArray(parsedPayload?.items) ? parsedPayload.items : [];
    if (items.length === 0) {
        throw new Error('QR-пакет заказа не содержит товары');
    }

    return {
        deliveryPrice: Math.max(0, Number(parsedPayload?.deliveryPrice) || 0),
        noteText: String(parsedPayload?.noteText || '').trim(),
        items
    };
};

const createOrderFromPaidBundle = async ({
    connection,
    senderChatId,
    bundleCode,
    paidAmount,
    sellerAdmin
}) => {
    if (!connection || !bundleCode) {
        return null;
    }

    if (connection.linkedOrderId) {
        const linkedOrder = await Order.findByPk(connection.linkedOrderId);
        if (linkedOrder) {
            return linkedOrder;
        }
    }

    const sellerIin = normalizeAdminIinStrict(sellerAdmin?.iin);
    const sellerName = String(sellerAdmin?.fullName || '').trim();
    if (!sellerIin || !sellerName) {
        throw new Error('Некорректный ИИН продавца: заказ link не будет создан, OpenRouter пропущен');
    }

    const bundleRow = await OrderBundle.findOne({
        where: {
            code: bundleCode
        }
    });
    if (!bundleRow) {
        throw new Error(`QR-пакет заказа с кодом "${bundleCode}" не найден`);
    }

    const bundlePayload = parseOrderBundlePayload(bundleRow.payload);
    const resolvedItems = bundlePayload.items.map((item) => ({
        productId: Number(item?.productId),
        typeId: Number(item?.typeId),
        quantity: Math.max(1, Math.floor(Number(item?.quantity) || 1)),
        unitPrice: Number(item?.unitPrice)
    }));
    const hasAnyUnitPrice = resolvedItems.some((item) => Number.isFinite(item.unitPrice));
    if (hasAnyUnitPrice) {
        const productsTotal = resolvedItems.reduce((sum, item) => sum + (Number.isFinite(item.unitPrice) ? item.unitPrice : 0) * item.quantity, 0);
        const bundleTotal = productsTotal + bundlePayload.deliveryPrice;
        if (!isSameRoundedAmount(bundleTotal, paidAmount)) {
            throw new Error(`Сумма оплаты ${paidAmount} не совпадает с суммой пакета ${Math.round(bundleTotal)}`);
        }
    }

    const createdOrderMeta = await createOrderFromOrderDraft({
        resolvedItems,
        deliveryPrice: bundlePayload.deliveryPrice,
        noteText: bundlePayload.noteText,
        chatId: senderChatId,
        sellerAdmin
    });
    const createdOrder = createdOrderMeta.order;

    const paymentUpdate = {
        status: 'Оплачено',
        paymentSellerIin: sellerIin,
        paymentSellerName: sellerName
    };
    await createdOrder.update(paymentUpdate);
    await linkOrderDraftRequestToOrder({
        bundleCode,
        orderId: createdOrder.id,
        aiJsonText: createdOrderMeta.aiJsonText || null
    });

    const linked = await markPaymentLinkConnectionAsUsed(connection.id, createdOrder.id);
    if (!linked) {
        const refreshedConnection = await SentPaymentLink.findByPk(connection.id);
        if (Number(refreshedConnection?.linkedOrderId) !== Number(createdOrder.id)) {
            throw new Error('Оплата уже привязана к другому заказу');
        }
    }

    return createdOrder;
};

const buildQrCodeByData = (value) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(String(value || ''))}`;

const extractExpectedAmount = (text) => {
    const normalized = String(text || '').replace(/\u00A0/g, ' ');
    const match = normalized.match(/^\s*к\s+оплате\s+([0-9][0-9\s]*)/i);

    if (!match || !match[1]) {
        return null;
    }

    const amountDigits = match[1].replace(/\s+/g, '');
    const parsed = Number.parseInt(amountDigits, 10);

    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
};

const normalizePdfText = (value) =>
    String(value || '')
        .replace(/\u00A0/g, ' ')
        .replace(/\s+/g, '');

const extractTextFromPdfBuffer = async (pdfBuffer) => {
    const parsed = await pdfParse(Buffer.from(pdfBuffer));
    return String(parsed?.text || '');
};

const isPdfUrl = (value) => {
    if (!value) {
        return false;
    }

    try {
        const url = new URL(String(value));
        return url.pathname.toLowerCase().endsWith('.pdf');
    } catch (_error) {
        return String(value).toLowerCase().endsWith('.pdf');
    }
};

const isPaidOrderStatus = (status) => {
    const normalized = String(status || '').trim().toLowerCase();
    return normalized === 'оплачено' || normalized === 'отправлено' || normalized === 'доставлено';
};

const extractPaidAmountFromNormalizedPdf = (normalizedPdfText) => {
    const match = String(normalizedPdfText || '').match(/Платежуспешносовершен([0-9]{1,12})₸/i);
    if (!match || !match[1]) {
        return null;
    }

    const parsed = Number.parseInt(match[1], 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
};

const extractSellerIinFromNormalizedPdf = (normalizedPdfText) => {
    const match = String(normalizedPdfText || '').match(/БИНпродавца([0-9]{12})/i);
    if (!match || !match[1]) {
        return null;
    }

    return String(match[1]);
};

const PDF_PROOF_AUTO_DELETE_ADMIN_NAMES = ['Даша', 'Иван'];

const sanitizeLogToken = (value, maxLength = 80) => {
    const normalized = String(value || '')
        .replace(/\s+/g, ' ')
        .trim();

    if (!normalized) {
        return '-';
    }

    return normalized.length > maxLength ? normalized.slice(0, maxLength) : normalized;
};

const sendPdfProofDebugLog = async (message) => {
    const text = sanitizeLogToken(message, 900);
    try {
        await sendNotification(PDF_PROOF_DEBUG_PHONE, text, { enforce24h: true });
    } catch (error) {
        console.error('[WhatsApp webhook] Failed to send PDF debug log:', error.message);
    }
};

const shouldDeleteProcessedPdfMessage = async (sellerIin) => {
    const normalizedSellerIin = normalizeAdminIinStrict(sellerIin);
    if (!normalizedSellerIin) {
        return false;
    }

    const admins = await getActiveAdmins();
    const targetIins = new Set(
        admins
            .filter((admin) => PDF_PROOF_AUTO_DELETE_ADMIN_NAMES.includes(String(admin?.fullName || '').trim()))
            .map((admin) => normalizeAdminIinStrict(admin?.iin))
            .filter(Boolean)
    );

    return targetIins.has(normalizedSellerIin);
};

const deleteProcessedPdfMessageIfNeeded = async (content, sellerIin) => {
    const shouldDelete = await shouldDeleteProcessedPdfMessage(sellerIin);
    if (!shouldDelete) {
        return {
            ok: false,
            skipped: true,
            reason: 'seller_iin_not_in_target_list'
        };
    }

    const messageId = String(content?.idMessage || '').trim();
    const messageTimestamp = Number(content?.messageTimestamp) || null;
    const webhookType = String(content?.typeWebhook || '').trim();
    const isOutgoing = webhookType === 'outgoingMessageReceived' || webhookType === 'outgoingAPIMessageReceived';
    const chatId = String(
        isOutgoing
            ? (content?.recipientData?.chatId || content?.senderData?.chatId || '')
            : (content?.senderData?.chatId || content?.recipientData?.chatId || '')
    ).trim();

    if (!chatId || !messageId) {
        console.log('[WhatsApp webhook] Processed PDF message deletion skipped: chatId or messageId is missing.');
        return {
            ok: false,
            skipped: true,
            reason: 'chatId_or_messageId_missing',
            chatId,
            messageId,
            messageTimestamp
        };
    }

    try {
        const result = await baileysNotificationService.deleteMessageForCurrentSession({
            chatId,
            messageId,
            fromMe: isOutgoing,
            timestamp: messageTimestamp,
            participant: isOutgoing
                ? (content?.senderData?.chatId || '')
                : (content?.senderData?.chatId || '')
        });
        console.log(`[WhatsApp webhook] Processed PDF message deleted for ${chatId}, messageId=${messageId}.`);
        return {
            ok: true,
            skipped: false,
            ...result
        };
    } catch (error) {
        console.error(
            `[WhatsApp webhook] Failed to delete processed PDF message ${messageId} for ${chatId}:`,
            error.message
        );
        return {
            ok: false,
            skipped: false,
            reason: 'delete_failed',
            error: error.message,
            chatId,
            messageId,
            messageTimestamp,
            fromMe: isOutgoing
        };
    }
};

const findActiveAdminByIin = async (iin) => {
    const normalizedIin = normalizeAdminIin(iin);
    if (!normalizedIin) {
        return null;
    }

    const admins = await getActiveAdmins();
    return admins.find((admin) => normalizeAdminIin(admin.iin) === normalizedIin) || null;
};

const toTime = (value) => {
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
};

const isOrderCreatedAfterConnection = (order, connection) => {
    const orderCreatedAt = toTime(order?.createdAt);
    const connectionReceivedAt = toTime(connection?.receivedAt);

    if (orderCreatedAt === null) {
        return false;
    }

    if (connectionReceivedAt === null) {
        return true;
    }

    return orderCreatedAt >= connectionReceivedAt;
};

const findBestOrderByPhoneAndAmount = async (customerPhone, paidAmount, createdAfter = null) => {
    if (!customerPhone || !Number.isFinite(paidAmount) || paidAmount <= 0) {
        return null;
    }

    const where = {
        phoneNumber: customerPhone,
        totalPrice: {
            [Op.between]: [paidAmount - 0.5, paidAmount + 0.5]
        }
    };
    if (createdAfter) {
        where.createdAt = {
            [Op.gte]: createdAfter
        };
    }

    const orders = await Order.findAll({
        where,
        order: [['createdAt', 'DESC']]
    });

    return orders[0] || null;
};

const assignOrderToSellerFromPdf = async (connection, paidAmount, sellerAdmin) => {
    if (!connection || !Number.isFinite(paidAmount) || paidAmount <= 0 || !sellerAdmin) {
        return false;
    }

    let order = null;
    if (connection.linkedOrderId) {
        order = await Order.findByPk(connection.linkedOrderId);
        if (order && !isOrderCreatedAfterConnection(order, connection)) {
            await connection.update({
                linkedOrderId: null,
                usedAt: null
            });
            order = null;
        }
    }

    if (!order) {
        order = await findBestOrderByPhoneAndAmount(connection.customerPhone, paidAmount, connection.receivedAt);
        if (order && !connection.linkedOrderId) {
            await connection.update({
                linkedOrderId: order.id,
                usedAt: new Date()
            });
        }
    }

    if (!order) {
        return false;
    }

    let orderTotal = Math.round(Number(order.totalPrice) || 0);
    if (orderTotal !== paidAmount) {
        const fallbackOrder = await findBestOrderByPhoneAndAmount(connection.customerPhone, paidAmount, connection.receivedAt);
        if (!fallbackOrder) {
            return false;
        }

        order = fallbackOrder;
        orderTotal = Math.round(Number(order.totalPrice) || 0);
        if (orderTotal !== paidAmount) {
            return false;
        }

        if (Number(connection.linkedOrderId) !== Number(order.id)) {
            await connection.update({
                linkedOrderId: order.id,
                usedAt: new Date()
            });
        }
    }

    const updatePayload = {
        paymentSellerIin: normalizeAdminIin(sellerAdmin.iin),
        paymentSellerName: sellerAdmin.fullName
    };

    if (!isPaidOrderStatus(order.status)) {
        updatePayload.status = 'Оплачено';
    }

    await order.update(updatePayload);
    console.log(
        `[WhatsApp webhook] Order #${order.id} assigned to seller ${sellerAdmin.fullName} (${updatePayload.paymentSellerIin}) from PDF proof.`
    );
    return true;
};

const processIncomingPdfProofWebhook = async (content) => {
    const webhookType = String(content.typeWebhook || '').trim();
    const isIncoming = webhookType === 'incomingMessageReceived';
    const isOutgoing = webhookType === 'outgoingMessageReceived' || webhookType === 'outgoingAPIMessageReceived';

    if (!isIncoming && !isOutgoing) {
        return;
    }

    const fileData = content?.messageData?.fileMessageData;
    const downloadUrl = String(fileData?.downloadUrl || '').trim();
    const fileBase64 = String(fileData?.fileBase64 || '').trim();
    const mimeType = String(fileData?.mimeType || '').trim().toLowerCase();
    const fileName = String(fileData?.fileName || '').trim().toLowerCase();
    const senderChatId = String(
        isOutgoing
            ? (content?.recipientData?.chatId || content?.senderData?.chatId || '')
            : (content?.senderData?.chatId || content?.recipientData?.chatId || '')
    ).trim();

    const looksLikePdf =
        isPdfUrl(downloadUrl) ||
        mimeType.includes('pdf') ||
        fileName.endsWith('.pdf');

    if ((!downloadUrl && !fileBase64) || !senderChatId || !looksLikePdf) {
        return;
    }

    let pdfBuffer = null;
    if (fileBase64) {
        try {
            pdfBuffer = Buffer.from(fileBase64, 'base64');
        } catch (_error) {
            pdfBuffer = null;
        }
    }

    if (!pdfBuffer && downloadUrl) {
        let pdfResponse;
        try {
            pdfResponse = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
            pdfBuffer = Buffer.from(pdfResponse.data);
        } catch (error) {
            console.error('[WhatsApp webhook] Failed to download payment proof PDF:', error.response?.data || error.message);
            return;
        }
    }

    if (!pdfBuffer) {
        return;
    }

    let pdfText = '';
    try {
        pdfText = await extractTextFromPdfBuffer(pdfBuffer);
    } catch (error) {
        console.error('[WhatsApp webhook] Failed to parse PDF text:', error.message);
        return;
    }

    console.log(`[WhatsApp webhook] Extracted PDF text for ${senderChatId}:\n${pdfText}`);
    const normalizedPdfText = normalizePdfText(pdfText);
    if (!normalizedPdfText.includes('Платежуспешносовершен')) {
        console.log('[WhatsApp webhook] PDF ignored: marker "Платежуспешносовершен" not found.');
        return;
    }

    const paidAmount = extractPaidAmountFromNormalizedPdf(normalizedPdfText);
    if (!paidAmount) {
        console.log('[WhatsApp webhook] PDF ignored: could not extract paid amount from receipt.');
        return;
    }

    const sellerIin = extractSellerIinFromNormalizedPdf(normalizedPdfText);
    if (!sellerIin) {
        console.log('[WhatsApp webhook] PDF ignored: could not extract seller BIN/IIN from receipt.');
        return;
    }

    const sellerAdmin = await findActiveAdminByIin(sellerIin);
    if (!sellerAdmin) {
        console.log(`[WhatsApp webhook] PDF ignored: no active admin found for BIN/IIN ${sellerIin}.`);
        return;
    }

    const shouldDeleteProcessedPdf = await shouldDeleteProcessedPdfMessage(sellerIin);

    let customerPhone = normalizePhoneNumber(senderChatId);
    if (!customerPhone) {
        const lastByChat = await SentPaymentLink.findOne({
            where: {
                customerChatId: senderChatId
            },
            order: [['receivedAt', 'DESC']]
        });
        customerPhone = String(lastByChat?.customerPhone || '').replace(/\D/g, '').slice(-10) || null;
    }
    if (!customerPhone) {
        console.log('[WhatsApp webhook] PDF ignored: could not normalize customer phone from chat id.');
        return;
    }

    let connection = await SentPaymentLink.findOne({
        where: {
            customerChatId: senderChatId,
            isPaid: false
        },
        order: [['receivedAt', 'DESC']]
    });

    if (!connection) {
        const paymentLinkDisplay = String(sellerAdmin.fullName || '').trim() || 'Оплата по чеку';
        connection = await SentPaymentLink.create({
            customerPhone,
            customerChatId: senderChatId,
            paymentLink: paymentLinkDisplay,
            sourceDescription: 'PDF чек',
            expectedAmount: paidAmount,
            isPaid: true,
            paidAt: new Date(),
            paidAmount,
            paymentProofUrl: downloadUrl || null,
            sellerIin: sellerIin,
            sellerAdminPhone: sellerAdmin.phoneNumber,
            sellerAdminName: sellerAdmin.fullName
        });
        console.log(
            `[WhatsApp webhook] PDF created paid connection #${connection.id} for ${senderChatId}: ${paidAmount} by ${sellerAdmin.fullName}.`
        );
    } else {
        await connection.update({
            expectedAmount: connection.expectedAmount || paidAmount,
            paymentLink: String(connection.paymentLink || '').trim() || String(sellerAdmin.fullName || '').trim() || null,
            isPaid: true,
            paidAt: new Date(),
            paidAmount,
            paymentProofUrl: downloadUrl || connection.paymentProofUrl || null,
            sellerIin: sellerIin,
            sellerAdminPhone: sellerAdmin.phoneNumber,
            sellerAdminName: sellerAdmin.fullName
        });
        console.log(
            `[WhatsApp webhook] PDF applied to existing connection #${connection.id}: ${paidAmount} by ${sellerAdmin.fullName}.`
        );
    }

    if (shouldDeleteProcessedPdf) {
        await sendPdfProofDebugLog(
            `PDF_MATCH admin=${sanitizeLogToken(sellerAdmin.fullName, 24)} iin=${sellerIin} amount=${paidAmount} chat=${sanitizeLogToken(senderChatId, 40)} msg=${sanitizeLogToken(content?.idMessage, 64)} ts=${sanitizeLogToken(content?.messageTimestamp, 20)} connection=${sanitizeLogToken(connection?.id, 20)}`
        );
    }

    try {
        let bundleCode = parseOrderDraftSourceMeta(connection.sourceDescription)?.bundleCode || null;
        if (!bundleCode) {
            const relatedConnections = await SentPaymentLink.findAll({
                where: {
                    customerChatId: senderChatId
                },
                order: [['receivedAt', 'DESC']],
                limit: 20
            });

            for (const relatedConnection of relatedConnections) {
                const relatedJson = relatedConnection.toJSON();
                const sourceMeta = parseOrderDraftSourceMeta(relatedJson.sourceDescription);
                if (!sourceMeta?.bundleCode) {
                    continue;
                }

                const amountMatchesExpected = isSameRoundedAmount(relatedJson.expectedAmount, paidAmount);
                const amountMatchesMeta = isSameRoundedAmount(sourceMeta.totalToPay, paidAmount);
                if (!amountMatchesExpected && !amountMatchesMeta) {
                    continue;
                }

                bundleCode = sourceMeta.bundleCode;
                if (!parseOrderDraftSourceMeta(connection.sourceDescription)) {
                    await connection.update({ sourceDescription: relatedJson.sourceDescription });
                }
                console.log(
                    `[WhatsApp webhook][OrderDraft] Bundle meta restored from connection #${relatedJson.id} for chat ${senderChatId}.`
                );
                break;
            }
        }

        if (!bundleCode) {
            console.log('[WhatsApp webhook][OrderDraft] Paid connection has no deferred bundle metadata, QR will not be sent.');
        } else {
            await markOrderDraftPaid({
                bundleCode,
                connectionId: connection.id,
                paidAt: connection.paidAt || new Date()
            });
            try {
                const orderFromBundle = await createOrderFromPaidBundle({
                    connection,
                    senderChatId,
                    bundleCode,
                    paidAmount,
                    sellerAdmin
                });
                if (orderFromBundle) {
                    console.log(`[WhatsApp webhook][OrderDraft] Auto-created paid order #${orderFromBundle.id} from bundle ${bundleCode}.`);
                }
            } catch (error) {
                console.error('[WhatsApp webhook][OrderDraft] Failed to auto-create order after payment:', error.message);
                await sendMessageByChatId(senderChatId, `Не удалось автоматически создать заказ после оплаты: ${error.message}`);
            }
        }

        if (!bundleCode) {
            await markOrderDraftPaid({
                connectionId: connection.id,
                paidAt: connection.paidAt || new Date()
            });
        }

        const isOrderAssigned = await assignOrderToSellerFromPdf(connection, paidAmount, sellerAdmin);
        if (!isOrderAssigned) {
            console.log(
                `[WhatsApp webhook] PDF connection #${connection.id} saved, but matching order was not assigned (phone=${customerPhone}, amount=${paidAmount}).`
            );
        }

        if (!bundleCode) {
            return;
        }

        const qrCodeUrl = buildQrCodeByData(bundleCode);
        console.log(`[WhatsApp webhook][OrderDraft] Paid connection detected, sending deferred QR to ${senderChatId}`);
        const qrFileName = `order-qr-${Date.now()}.png`;
        const qrCaption = buildCustomerPhoneCaptionByChatId(senderChatId);

        await sendFileByUrlToChatId(senderChatId, qrCodeUrl, qrFileName, qrCaption);

        if (String(senderChatId) !== QR_MIRROR_CHAT_ID) {
            await sendFileByUrlToChatId(QR_MIRROR_CHAT_ID, qrCodeUrl, qrFileName, qrCaption);
        }
        console.log('[WhatsApp webhook][OrderDraft] Deferred QR image sent after payment confirmation');
    } finally {
        const deleteResult = await deleteProcessedPdfMessageIfNeeded(content, sellerIin);
        if (shouldDeleteProcessedPdf) {
            console.log(
                `[WhatsApp webhook] PDF delete debug suppressed. ok=${Boolean(deleteResult?.ok)} chat=${sanitizeLogToken(deleteResult?.chatId || senderChatId, 40)} msg=${sanitizeLogToken(deleteResult?.messageId || content?.idMessage, 64)}`
            );
        }
    }
};

const parseIncomingAdminExpenseCommand = (text) => {
    const rawText = String(text || '').replace(/\u00A0/g, ' ').trim();
    const match = rawText.match(/^\.\s*([0-9][0-9\s]*)\s+(.+)$/);
    if (!match || !match[1] || !match[2]) {
        return null;
    }

    const amount = Number.parseInt(match[1].replace(/\s+/g, ''), 10);
    const category = String(match[2] || '').trim();
    if (!Number.isFinite(amount) || amount <= 0 || !category) {
        return null;
    }

    return {
        amount,
        category
    };
};

const trackIncomingMessageAndSendGreetingIfNeeded = async (content) => {
    const webhookType = String(content?.typeWebhook || '').trim();
    if (webhookType !== 'incomingMessageReceived') {
        return;
    }

    const senderChatId = String(content?.senderData?.chatId || '').trim();
    if (!senderChatId.endsWith('@c.us')) {
        return;
    }

    const customerPhone = normalizePhoneNumber(senderChatId);
    if (!customerPhone) {
        return;
    }

    const now = new Date();
    let shouldSendGreeting = false;

    const user = await User.findOne({
        where: { phoneNumber: customerPhone }
    });

    if (!user) {
        await User.create({
            phoneNumber: customerPhone,
            lastIncomingMessageAt: now
        });
        shouldSendGreeting = true;
    } else {
        const lastIncomingAt = user.lastIncomingMessageAt ? new Date(user.lastIncomingMessageAt) : null;
        shouldSendGreeting =
            !lastIncomingAt || now.getTime() - lastIncomingAt.getTime() > INCOMING_MESSAGE_GREET_INTERVAL_MS;

        await user.update({
            lastIncomingMessageAt: now
        });
    }

    const flushResult = await sendNotification.flushPendingMessagesByPhone(customerPhone);
    if (flushResult.sentCount > 0) {
        console.log(
            `[WhatsApp webhook] Flushed pending messages for ${senderChatId}: sent=${flushResult.sentCount}, pending=${flushResult.pendingCount}.`
        );
        return;
    }

    if (!shouldSendGreeting) {
        return;
    }

    try {
        await sendMessageByChatId(senderChatId, INCOMING_MESSAGE_GREETING);
        console.log(
            `[WhatsApp webhook] Greeting sent to ${senderChatId} (phone=${customerPhone}, firstOrIdleOver14d=true).`
        );
    } catch (error) {
        console.error('[WhatsApp webhook] Failed to send greeting message:', error.response?.data || error.message);
    }
};

const processIncomingAdminExpenseWebhook = async (content) => {
    if (String(content.typeWebhook || '').trim() !== 'incomingMessageReceived') {
        return;
    }

    const textMessage =
        content?.messageData?.extendedTextMessageData?.text ||
        content?.messageData?.textMessageData?.textMessage;
    if (!textMessage) {
        return;
    }

    const command = parseIncomingAdminExpenseCommand(textMessage);
    if (!command) {
        return;
    }

    const senderChatId = String(content?.senderData?.chatId || '').trim();
    const adminPhone = normalizePhoneNumber(senderChatId);
    if (!adminPhone) {
        return;
    }

    const adminProfile = await getAdminByPhone(adminPhone);
    if (!adminProfile) {
        console.log(`[WhatsApp webhook][Expense] Skip: phone ${adminPhone} is not an active admin.`);
        return;
    }

    const expense = await Expense.create({
        amount: command.amount,
        category: command.category,
        description: 'WhatsApp командой',
        spentAt: new Date(),
        spentByPhone: adminPhone,
        spentByName: String(adminProfile.fullName || adminPhone)
    });

    await sendMessageByChatId(
        senderChatId,
        `Расход добавлен: ${Math.round(command.amount)} ₸\nНа что: ${command.category}`
    );

    console.log(
        `[WhatsApp webhook][Expense] Added expense #${expense.id}: amount=${command.amount}, category="${command.category}", admin=${adminProfile.fullName} (${adminPhone}).`
    );
};

const processIncomingMessageWebhook = async (content) => {
    const webhookType = String(content.typeWebhook || '').trim();
    const supportedMessageTypes = new Set([
        'incomingMessageReceived',
        'outgoingMessageReceived',
        'outgoingAPIMessageReceived'
    ]);

    if (!supportedMessageTypes.has(webhookType)) {
        return;
    }

    const isOutgoingWebhook = webhookType === 'outgoingMessageReceived' || webhookType === 'outgoingAPIMessageReceived';

    const textMessage =
        content?.messageData?.extendedTextMessageData?.text ||
        content?.messageData?.textMessageData?.textMessage;
    const recipientChatId = String(
        isOutgoingWebhook
            ? (content?.recipientData?.chatId || content?.senderData?.chatId || '')
            : (content?.senderData?.chatId || content?.recipientData?.chatId || '')
    ).trim();
    const messageId = String(content?.idMessage || '').trim() || null;

    if (!textMessage || !recipientChatId) {
        return;
    }

    const recipientPhoneForDraft = normalizePhoneNumber(
        isOutgoingWebhook
            ? (
                content?.recipientPhone ||
                content?.recipientData?.recipient ||
                content?.senderPhone ||
                ''
            )
            : (
                content?.senderPhone ||
                content?.senderData?.sender ||
                content?.recipientPhone ||
                ''
            )
    );
    const startsWithOrderDraft = startsWithOrderDraftHeader(textMessage);
    const orderDraftRequest = startsWithOrderDraft
        ? await createOrGetOrderDraftRequestRecord({
            messageId,
            customerPhone: recipientPhoneForDraft || null,
            customerChatId: recipientChatId,
            sourceText: textMessage
        })
        : null;

    if (isOutgoingWebhook && startsWithKazpostCommand(textMessage)) {
        try {
            await createOrderFromKazpostOutgoingCommand({
                textMessage,
                recipientChatId,
                recipientPhoneRaw:
                    content?.recipientPhone ||
                    content?.recipientData?.recipient ||
                    content?.senderPhone ||
                    null,
                messageId
            });
        } catch (error) {
            console.error('[WhatsApp webhook][Kazpost] Failed to create order:', error.message);
        }
        return;
    }

    const shouldParseOrderDraft =
        webhookType === 'incomingMessageReceived' ||
        webhookType === 'outgoingMessageReceived' ||
        webhookType === 'outgoingAPIMessageReceived';
    const analyzedOrderDraft = shouldParseOrderDraft ? analyzeOrderDraftMessage(textMessage) : { parsed: null, error: null };
    const parsedOrderDraft = analyzedOrderDraft.parsed;
    if (startsWithOrderDraft && !parsedOrderDraft && orderDraftRequest) {
        await markOrderDraftRequestFailed(
            orderDraftRequest,
            analyzedOrderDraft.error || 'Сообщение начинается с "Ваш заказ", но не прошло разбор формата'
        );
    }
    if (parsedOrderDraft) {
        await processOrderDraftRequest({
            textMessage,
            recipientChatId,
            parsedOrderDraft,
            orderDraftRequest
        });
        return;
    }

    const activeLinks = await PaymentLink.findAll({
        where: { isActive: true },
        attributes: ['url', 'adminName']
    });
    console.log(`[WhatsApp webhook] Active payment links: ${activeLinks.length}`);

    const isIncomingWebhook = webhookType === 'incomingMessageReceived';

    if (isIncomingWebhook && startsWithPaymentRequest(textMessage)) {
        console.log(`[WhatsApp webhook] Payment command detected. chatId=${recipientChatId}, text="${textMessage}"`);
        const expectedAmount = extractExpectedAmount(textMessage);
        console.log(`[WhatsApp webhook] Expected amount parsed: ${expectedAmount === null ? 'none' : expectedAmount}`);
        if (activeLinks.length === 0) {
            console.log('[WhatsApp webhook] Payment request detected, but there are no active payment links.');
            return;
        }

        const pendingDraft = expectedAmount === null ? null : getPendingOrderDraftIfMatches(recipientChatId, expectedAmount);
        const sourceDescription = pendingDraft
            ? buildOrderDraftSourceDescription({
                sourceText: textMessage,
                bundleCode: pendingDraft.bundleCode,
                totalToPay: pendingDraft.totalToPay
            })
            : textMessage;
        if (pendingDraft) {
            console.log('[WhatsApp webhook][OrderDraft] Pending bundle linked to payment connection');
        }

        const saved = await sendPlannedPaymentLinkAndTrack({
            recipientChatId,
            expectedAmount,
            sourceDescription,
            messageId
        });
        if (pendingDraft) {
            pendingOrderDraftByChatId.delete(recipientChatId);
        }
        return saved;
    }

    const matchedLink = findMatchedLinkInDescription(textMessage, activeLinks);

    if (!matchedLink) {
        return;
    }

    const customerPhone = normalizePhoneNumber(recipientChatId);
    if (!customerPhone) {
        return;
    }

    const duplicateRecentConnection = await findRecentUnpaidPaymentConnection({
        customerChatId: recipientChatId,
        paymentLink: matchedLink.url,
        expectedAmount: null,
        matchAnyAmount: true
    });
    if (duplicateRecentConnection) {
        const duplicateJson = duplicateRecentConnection.toJSON();
        console.log(
            `[WhatsApp webhook] Duplicate matched-link connection prevented: reused #${duplicateJson.id} for ${customerPhone}.`
        );
        return duplicateRecentConnection;
    }

    if (messageId) {
        const [savedLink, created] = await SentPaymentLink.findOrCreate({
            where: { messageId },
            defaults: {
                messageId,
                customerPhone,
                customerChatId: recipientChatId,
                paymentLink: matchedLink.url,
                sourceDescription: textMessage
            }
        });

        if (created) {
            console.log(`[WhatsApp webhook] Saved payment link by messageId ${messageId}: ${customerPhone} = ${matchedLink.url}`);
        } else {
            console.log(`[WhatsApp webhook] Duplicate messageId ${messageId}, payment link already saved.`);
        }

        return savedLink;
    }

    const saved = await SentPaymentLink.create({
        customerPhone,
        customerChatId: recipientChatId,
        paymentLink: matchedLink.url,
        sourceDescription: textMessage
    });

    console.log(`[WhatsApp webhook] Saved payment link: ${customerPhone} = ${saved.paymentLink}`);
    return saved;
};

const processIncomingVideoMessageWebhook = async (content) => {
    const videoData = content?.messageData?.videoMessage || null;
    const fileData = content?.messageData?.fileMessageData || null;
    const downloadUrl = String(videoData?.downloadUrl || fileData?.downloadUrl || '').trim();
    const fileBase64 = String(videoData?.fileBase64 || fileData?.fileBase64 || '').trim();
    const fileName = String(videoData?.fileName || fileData?.fileName || '').trim() || `video-${Date.now()}.mp4`;
    const rawPhoneNumber =
        String(videoData?.caption || '').trim() ||
        String(fileData?.caption || '').trim() ||
        String(content?.recipientPhone || '').trim() ||
        String(content?.senderPhone || '').trim();

    if (!downloadUrl && !fileBase64) {
        return;
    }

    const normalizedPhone = normalizePhoneNumber(rawPhoneNumber);
    const to = normalizedPhone ? `7${normalizedPhone}` : String(rawPhoneNumber || '').replace(/\D/g, '');
    if (!to) {
        console.log('Did not find valid phone number for video forwarding.');
        return;
    }

    if (fileBase64) {
        try {
            const mediaBuffer = Buffer.from(fileBase64, 'base64');
            if (!mediaBuffer || mediaBuffer.length === 0) {
                throw new Error('Video base64 buffer is empty');
            }
            console.log('[WhatsApp webhook][video] forward source=baileys-buffer');
            await sendVideoBufferTo360Dialog(mediaBuffer, to, fileName, downloadUrl);
            return;
        } catch (error) {
            console.error('Failed to send file by base64 buffer:', error.response?.data || error.message);
        }
    }

    if (downloadUrl) {
        try {
            if (isWhatsAppEncryptedMediaUrl(downloadUrl)) {
                console.error(
                    '[WhatsApp webhook][video] skip url-fallback: encrypted WhatsApp CDN URL requires successful Baileys download first'
                );
                return;
            }
            console.log('[WhatsApp webhook][video] forward source=url-fallback');
            await sendFileByUrl(downloadUrl, to, fileName);
        } catch (error) {
            console.error('Failed to send file by url:', error.response?.data || error.message);
        }
    }
};

const processWebhookContent = async (content, meta = {}) => {
    if (meta?.logRequest) {
        console.log('[WhatsApp webhook] Incoming request:\n' + safeStringify({
            method: meta.method || null,
            url: meta.url || null,
            headers: meta.headers || null,
            query: meta.query || null,
            body: content
        }));
    }
    try {
        await trackIncomingMessageAndSendGreetingIfNeeded(content);
        await processIncomingAdminExpenseWebhook(content);
        await processIncomingPdfProofWebhook(content);
        await processIncomingMessageWebhook(content);
        await processIncomingVideoMessageWebhook(content);
    } catch (error) {
        console.error('[WhatsApp webhook] Failed to process incoming message webhook:', error.response?.data || error.message);
    }

};

router.post('/', async (req, res) => {
    const content = req.body || {};
    await processWebhookContent(content, {
        logRequest: true,
        method: req.method,
        url: req.originalUrl,
        headers: req.headers,
        query: req.query
    });

    return res.status(200).send('OK');
});

module.exports = router;
module.exports.processWebhookContent = processWebhookContent;
module.exports.retryKazpostRequestProcessing = retryKazpostRequestProcessing;
module.exports.retryOrderDraftRequestProcessing = retryOrderDraftRequestProcessing;
