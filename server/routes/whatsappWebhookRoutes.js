const express = require('express');
const axios = require('axios');
const PaymentLink = require('../models/orders/PaymentLink');
const SentPaymentLink = require('../models/orders/SentPaymentLink');
const { findMatchedLinkInDescription, normalizePhoneNumber } = require('../utilities/paymentLinkUtils');

const router = express.Router();

const GREEN_API_SEND_FILE_URL =
    'https://api.green-api.com/waInstance1101834631/sendFileByUrl/b6a5812c82f049d28b697b802aa81667c54a6842696c4aac87';

const DEFAULT_CAPTION =
    'Посылочка идет на отправку. ‼️ Видео обязательно к просмотру ‼️ Обязательно сверьте свой заказ с содержимым коробки';

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

    const response = await axios.post(GREEN_API_SEND_FILE_URL, payload);
    console.log('Response from Green API:', response.data);
};

const processIncomingMessageWebhook = async (content) => {
    if (String(content.typeWebhook || '') !== 'outgoingMessageReceived') {
        return;
    }

    const textMessage = content?.messageData?.textMessageData?.textMessage;
    const recipientChatId = String(content?.recipientData?.chatId || content?.senderData?.chatId || '');
    const messageId = String(content?.idMessage || '').trim() || null;

    if (!textMessage || !recipientChatId) {
        return;
    }

    const activeLinks = await PaymentLink.findAll({
        where: { isActive: true },
        attributes: ['url', 'adminName']
    });
    const matchedLink = findMatchedLinkInDescription(textMessage, activeLinks);

    if (!matchedLink) {
        return;
    }

    const customerPhone = normalizePhoneNumber(recipientChatId);
    if (!customerPhone) {
        return;
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
        await processIncomingMessageWebhook(content);
    } catch (error) {
        console.error('[WhatsApp webhook] Failed to process incoming message webhook:', error.message);
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
