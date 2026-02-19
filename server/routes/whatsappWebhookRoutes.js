const express = require('express');
const axios = require('axios');
const Sequelize = require('sequelize');
const pdfParse = require('pdf-parse');
const PaymentLink = require('../models/orders/PaymentLink');
const SentPaymentLink = require('../models/orders/SentPaymentLink');
const OrderBundle = require('../models/orders/OrderBundle');
const Expense = require('../models/orders/Expense');
const Order = require('../models/orders/Order');
const Product = require('../models/Product');
const ProductType = require('../models/ProductType');
const { findMatchedLinkInDescription, normalizePhoneNumber } = require('../utilities/paymentLinkUtils');
const { pickNextPaymentLinkByDispatchPlan } = require('../utilities/paymentLinkDispatchPlan');
const { getActiveAdmins, getAdminByPhone, normalizeAdminIin } = require('../utilities/adminUsers');

const router = express.Router();
const { Op } = Sequelize;

const GREEN_API_SEND_FILE_URL =
    'https://api.greenapi.com/waInstance1101834631/sendFileByUrl/b6a5812c82f049d28b697b802aa81667c54a6842696c4aac87';
const GREEN_API_SEND_MESSAGE_URL =
    'https://api.greenapi.com/waInstance1101834631/sendMessage/b6a5812c82f049d28b697b802aa81667c54a6842696c4aac87';

const DEFAULT_CAPTION =
    'Посылочка идет на отправку. ‼️ Видео обязательно к просмотру ‼️ Обязательно сверьте свой заказ с содержимым коробки';
const ORDER_DRAFT_SOURCE_PREFIX = '__ORDER_DRAFT__';
const ORDER_DRAFT_TTL_MS = 1000 * 60 * 60 * 6;
const PAYMENT_LINK_DUPLICATE_WINDOW_MS = 1000 * 60 * 3;
const pendingOrderDraftByChatId = new Map();
const PAYMENT_LINK_FOOTER =
    'После оплаты скиньте пожалуйста чек\n‼️Без чека отправки не будет';
const ORDER_BUNDLE_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

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

    const payload = {
        chatId: `${phoneNumber}@c.us`,
        urlFile: url,
        fileName,
        caption: DEFAULT_CAPTION
    };

    try {
        const response = await axios.post(GREEN_API_SEND_FILE_URL, payload);
        console.log('Response from Green API:', response.data);
    } catch (error) {
        console.error('[WhatsApp webhook] sendFileByUrl failed:', {
            status: error.response?.status || null,
            data: error.response?.data || null,
            message: error.message
        });
        throw error;
    }
};

const sendMessageByChatId = async (chatId, message) => {
    if (!chatId || !message) {
        return null;
    }

    const payload = { chatId, message };
    const response = await axios.post(GREEN_API_SEND_MESSAGE_URL, payload);
    console.log('Response from Green API (sendMessage):', response.data);
    return response.data;
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

const startsWithPaymentRequest = (text) => {
    const normalized = String(text || '')
        .replace(/\u00A0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

    return normalized.startsWith('к оплате');
};

const normalizeAlias = (value) =>
    String(value || '')
        .replace(/\u00A0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

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

const parseOrderDraftMessage = (text) => {
    const rawText = String(text || '');
    console.log(`[WhatsApp webhook][OrderDraft] Raw text received (${rawText.length} chars)`);
    if (!rawText) {
        console.log('[WhatsApp webhook][OrderDraft] Skip: empty text');
        return null;
    }

    const lines = rawText
        .split(/\r?\n/)
        .map((line) => String(line || '').trim())
        .filter((line) => line.length > 0);

    if (lines.length < 3) {
        console.log(`[WhatsApp webhook][OrderDraft] Skip: not enough lines (${lines.length})`);
        return null;
    }

    const firstLineNormalized = normalizeAlias(lines[0]).replace(/:$/, '');
    if (firstLineNormalized !== 'ваш заказ') {
        console.log(
            `[WhatsApp webhook][OrderDraft] Skip: first line is not "Ваш заказ" (got "${lines[0]}")`
        );
        return null;
    }

    const deliveryLineIndex = lines.findIndex((line, index) => {
        if (index === 0) {
            return false;
        }
        return /^доставка\s+[0-9][0-9\s]*/i.test(line);
    });

    if (deliveryLineIndex < 1) {
        console.log('[WhatsApp webhook][OrderDraft] Skip: delivery line not found');
        return null;
    }

    const deliveryLine = lines[deliveryLineIndex];
    const deliveryMatch = deliveryLine.match(/^доставка\s+([0-9][0-9\s]*)/i);
    if (!deliveryMatch || !deliveryMatch[1]) {
        console.log(
            `[WhatsApp webhook][OrderDraft] Skip: delivery line does not match pattern (got "${deliveryLine}")`
        );
        return null;
    }

    const deliveryPrice = Number.parseInt(deliveryMatch[1].replace(/\s+/g, ''), 10);
    if (!Number.isFinite(deliveryPrice) || deliveryPrice < 0) {
        console.log(
            `[WhatsApp webhook][OrderDraft] Skip: invalid delivery price parsed from "${deliveryLine}"`
        );
        return null;
    }

    const aliasEntries = lines
        .slice(1, deliveryLineIndex)
        .map(parseAliasLineWithQuantity)
        .filter(Boolean);

    if (aliasEntries.length === 0) {
        console.log('[WhatsApp webhook][OrderDraft] Skip: aliases list is empty');
        return null;
    }

    const noteText = lines
        .slice(deliveryLineIndex + 1)
        .map((line) => String(line || '').trim())
        .filter(Boolean)
        .join('\n');

    console.log(
        `[WhatsApp webhook][OrderDraft] Parsed successfully: aliases=${aliasEntries.length}, delivery=${deliveryPrice}, noteLength=${noteText.length}`
    );
    console.log('[WhatsApp webhook][OrderDraft] Aliases:', aliasEntries);

    return {
        aliases: aliasEntries,
        deliveryPrice,
        noteText
    };
};

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
    if (String(content.typeWebhook || '') !== 'incomingMessageReceived') {
        return;
    }

    const fileData = content?.messageData?.fileMessageData;
    const downloadUrl = String(fileData?.downloadUrl || '').trim();
    const senderChatId = String(content?.senderData?.chatId || '').trim();

    if (!downloadUrl || !senderChatId || !isPdfUrl(downloadUrl)) {
        return;
    }

    let pdfResponse;
    try {
        pdfResponse = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
    } catch (error) {
        console.error('[WhatsApp webhook] Failed to download payment proof PDF:', error.response?.data || error.message);
        return;
    }

    let pdfText = '';
    try {
        pdfText = await extractTextFromPdfBuffer(pdfResponse.data);
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

    const customerPhone = normalizePhoneNumber(senderChatId);
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
            paymentProofUrl: downloadUrl,
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
            paymentProofUrl: downloadUrl,
            sellerIin: sellerIin,
            sellerAdminPhone: sellerAdmin.phoneNumber,
            sellerAdminName: sellerAdmin.fullName
        });
        console.log(
            `[WhatsApp webhook] PDF applied to existing connection #${connection.id}: ${paidAmount} by ${sellerAdmin.fullName}.`
        );
    }

    const isOrderAssigned = await assignOrderToSellerFromPdf(connection, paidAmount, sellerAdmin);
    if (!isOrderAssigned) {
        console.log(
            `[WhatsApp webhook] PDF connection #${connection.id} saved, but matching order was not assigned (phone=${customerPhone}, amount=${paidAmount}).`
        );
    }

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
        return;
    }

    const qrCodeUrl = buildQrCodeByData(bundleCode);
    console.log(`[WhatsApp webhook][OrderDraft] Paid connection detected, sending deferred QR to ${senderChatId}`);
    await sendFileByUrlToChatId(
        senderChatId,
        qrCodeUrl,
        `order-qr-${Date.now()}.png`,
        'QR '
    );
    console.log('[WhatsApp webhook][OrderDraft] Deferred QR image sent after payment confirmation');
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

    const textMessage =
        content?.messageData?.extendedTextMessageData?.text ||
        content?.messageData?.textMessageData?.textMessage;
    const recipientChatId = String(content?.senderData?.chatId || content?.recipientData?.chatId || '').trim();
    const messageId = String(content?.idMessage || '').trim() || null;

    if (!textMessage || !recipientChatId) {
        return;
    }

    const parsedOrderDraft = parseOrderDraftMessage(textMessage);
    if (parsedOrderDraft) {
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
            await sendMessageByChatId(
                recipientChatId,
                `Не найдены псевдонимы: ${resolved.unknownAliases.join(', ')}`
            );
            console.log('[WhatsApp webhook][OrderDraft] Sent unknown aliases message to chat');
            return;
        }

        if (resolved.items.length === 0) {
            console.log('[WhatsApp webhook][OrderDraft] Resolved items are empty, notifying chat');
            await sendMessageByChatId(recipientChatId, 'Не удалось собрать заказ: список товаров пуст.');
            return;
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
                quantity: item.quantity
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

        console.log(
            `[WhatsApp webhook] Order draft accepted. QR deferred until payment. chatId=${recipientChatId}, items=${resolved.items.length}, total=${totalToPay}`
        );
        return;
    }

    const activeLinks = await PaymentLink.findAll({
        where: { isActive: true },
        attributes: ['url', 'adminName']
    });
    console.log(`[WhatsApp webhook] Active payment links: ${activeLinks.length}`);

    if (startsWithPaymentRequest(textMessage)) {
        console.log(`[WhatsApp webhook] Payment command detected. chatId=${recipientChatId}, text="${textMessage}"`);
        const expectedAmount = extractExpectedAmount(textMessage);
        console.log(`[WhatsApp webhook] Expected amount parsed: ${expectedAmount === null ? 'none' : expectedAmount}`);
        if (activeLinks.length === 0) {
            console.log('[WhatsApp webhook] Payment request detected, but there are no active payment links.');
            return;
        }

        const plannedLink = await pickNextPaymentLinkByDispatchPlan();
        if (!plannedLink) {
            console.log('[WhatsApp webhook] Payment request detected, but there are no links from dispatch plan.');
            return;
        }

        console.log(`[WhatsApp webhook] Sending planned payment link to ${recipientChatId}: ${plannedLink.url}`);
        await sendMessageByChatId(recipientChatId, `${plannedLink.url}\n${PAYMENT_LINK_FOOTER}`);

        const customerPhone = normalizePhoneNumber(recipientChatId);
        if (!customerPhone) {
            return null;
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

        const duplicateRecentConnection = await findRecentUnpaidPaymentConnection({
            customerChatId: recipientChatId,
            paymentLink: plannedLink.url,
            expectedAmount
        });
        if (duplicateRecentConnection) {
            const duplicateJson = duplicateRecentConnection.toJSON();
            const hasBundleMeta = Boolean(parseOrderDraftSourceMeta(duplicateJson.sourceDescription)?.bundleCode);
            if (pendingDraft && !hasBundleMeta) {
                await duplicateRecentConnection.update({ sourceDescription });
                console.log(
                    `[WhatsApp webhook][OrderDraft] Reused recent connection #${duplicateJson.id} and attached deferred bundle metadata.`
                );
            } else {
                console.log(
                    `[WhatsApp webhook] Duplicate payment connection prevented: reused #${duplicateJson.id} for ${customerPhone}.`
                );
            }

            if (pendingDraft) {
                pendingOrderDraftByChatId.delete(recipientChatId);
            }
            return duplicateRecentConnection;
        }

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
                if (pendingDraft) {
                    pendingOrderDraftByChatId.delete(recipientChatId);
                }
            } else {
                console.log(`[WhatsApp webhook] Duplicate messageId ${messageId}, planned payment link was already processed.`);
                if (pendingDraft && !parseOrderDraftSourceMeta(savedLink.sourceDescription)?.bundleCode) {
                    await savedLink.update({ sourceDescription });
                    console.log(`[WhatsApp webhook][OrderDraft] Added deferred bundle metadata to existing messageId ${messageId}.`);
                }
                if (pendingDraft) {
                    pendingOrderDraftByChatId.delete(recipientChatId);
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
        if (pendingDraft) {
            pendingOrderDraftByChatId.delete(recipientChatId);
        }

        console.log(`[WhatsApp webhook] Planned payment link sent and saved: ${customerPhone} = ${saved.paymentLink}`);
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

router.post('/', async (req, res) => {
    const content = req.body || {};
    console.log('[WhatsApp webhook] Incoming request:\n' + safeStringify({
        method: req.method,
        url: req.originalUrl,
        headers: req.headers,
        query: req.query,
        body: content
    }));

    try {
        await processIncomingAdminExpenseWebhook(content);
        await processIncomingPdfProofWebhook(content);
        await processIncomingMessageWebhook(content);
    } catch (error) {
        console.error('[WhatsApp webhook] Failed to process incoming message webhook:', error.response?.data || error.message);
    }

    const search = 'videoMessage';
    if (!JSON.stringify(content).includes(search)) {
        return res.status(200).send('OK');
    }

    console.log(`${search} found in content.`);

    const downloadUrl = findFirstValueByKey(content, 'downloadUrl');
    if (downloadUrl) {
        console.log('Found download_url:', downloadUrl);
    }

    const phoneNumber = findFirstValueByKey(content, 'caption');
    if (phoneNumber) {
        console.log('Found phone_number:', phoneNumber);
    }

    const fileName = findFirstValueByKey(content, 'fileName');
    if (fileName) {
        console.log('Found file_name:', fileName);
    }

    if (downloadUrl && phoneNumber && fileName) {
        try {
            await sendFileByUrl(downloadUrl, phoneNumber, fileName);
        } catch (error) {
            console.error('Failed to send file by url:', error.response?.data || error.message);
        }
    } else {
        console.log('Did not find all required fields.');
    }

    return res.status(200).send('OK');
});

module.exports = router;
