const crypto = require('crypto');
const express = require('express');
const User = require('../models/orders/User');
const ChatwootMessageSync = require('../models/orders/ChatwootMessageSync');
const dialog360Service = require('../utilities/dialog360Service');
const sendNotification = require('../utilities/notificationService');
const {
    processIncomingMessageWebhook
} = require('./whatsappWebhookRoutes');
const {
    CHATWOOT_WEBHOOK_SECRET
} = require('../config/chatwoot');
const { normalizePhoneNumber } = require('../utilities/paymentLinkUtils');

const router = express.Router();

const HEADER_SIGNATURE = 'x-chatwoot-signature';
const HEADER_TIMESTAMP = 'x-chatwoot-timestamp';
const SIGNATURE_TTL_SECONDS = 60 * 10;
const PHONE_NUMBER_PATTERN = /(?:\+?7|8)?[\s()-]*\d(?:[\d\s()-]{8,16}\d)?/g;

const safeArray = (value) => Array.isArray(value) ? value : [];

const secureCompare = (left, right) => {
    const leftBuffer = Buffer.from(String(left || ''), 'utf8');
    const rightBuffer = Buffer.from(String(right || ''), 'utf8');

    if (leftBuffer.length !== rightBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const verifyWebhookSignature = (req) => {
    if (!CHATWOOT_WEBHOOK_SECRET) {
        return true;
    }

    const receivedSignature = String(req.headers[HEADER_SIGNATURE] || '').trim();
    const timestamp = String(req.headers[HEADER_TIMESTAMP] || '').trim();
    const rawBody = typeof req.rawBody === 'string' ? req.rawBody : '';

    if (!receivedSignature || !timestamp || !rawBody) {
        return false;
    }

    const timestampNumber = Number.parseInt(timestamp, 10);
    if (!Number.isFinite(timestampNumber)) {
        return false;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSeconds - timestampNumber) > SIGNATURE_TTL_SECONDS) {
        return false;
    }

    const expectedSignature = `sha256=${crypto
        .createHmac('sha256', CHATWOOT_WEBHOOK_SECRET)
        .update(`${timestamp}.${rawBody}`)
        .digest('hex')}`;

    return secureCompare(expectedSignature, receivedSignature);
};

const isSupportedOutboundMessage = (payload) => {
    if (String(payload?.event || '').trim() !== 'message_created') {
        return false;
    }

    if (payload?.private === true || payload?.is_private === true) {
        return false;
    }

    const messageType = String(payload?.message_type || '').trim().toLowerCase();
    return messageType === 'outgoing';
};

const buildTextContent = (payload) => String(payload?.content || '').trim();

const extractPhoneCandidates = (value) => {
    const matches = String(value || '').match(PHONE_NUMBER_PATTERN) || [];
    return matches
        .map((candidate) => normalizePhoneNumber(candidate))
        .filter(Boolean);
};

const pickAttachmentUrl = (attachment) => {
    const candidates = [
        attachment?.data_url,
        attachment?.external_url,
        attachment?.download_url,
        attachment?.file_url,
        attachment?.url
    ];

    return candidates
        .map((value) => String(value || '').trim())
        .find(Boolean) || '';
};

const pickAttachmentFileName = (attachment, index) => {
    const candidate = String(
        attachment?.file_name ||
        attachment?.filename ||
        attachment?.name ||
        ''
    ).trim();

    if (candidate) {
        return candidate;
    }

    const extension = String(attachment?.extension || '').trim().replace(/^\./, '');
    return extension ? `chatwoot-${index + 1}.${extension}` : `chatwoot-${index + 1}`;
};

const pickAttachmentMimeType = (attachment) => String(
    attachment?.file_type ||
    attachment?.content_type ||
    attachment?.mime_type ||
    ''
).trim();

const extractAttachments = (payload) => {
    const directAttachments = safeArray(payload?.attachments);
    const singleAttachment = payload?.attachment && typeof payload.attachment === 'object'
        ? [payload.attachment]
        : [];

    return [...directAttachments, ...singleAttachment]
        .map((attachment, index) => ({
            url: pickAttachmentUrl(attachment),
            fileName: pickAttachmentFileName(attachment, index),
            mimeType: pickAttachmentMimeType(attachment)
        }))
        .filter((attachment) => attachment.url);
};

const buildMessageProcessingContent = ({ customerPhone, textContent, providerMessageId }) => ({
    typeWebhook: 'outgoingAPIMessageReceived',
    idMessage: String(providerMessageId || '').trim() || `chatwoot-local-${Date.now()}`,
    senderPhone: null,
    recipientPhone: customerPhone,
    senderData: {
        chatId: '',
        sender: '',
        senderName: 'Chatwoot'
    },
    recipientData: {
        chatId: dialog360Service.normalizePhoneToChatId(customerPhone) || '',
        recipient: customerPhone
    },
    messageData: {
        typeMessage: 'textMessage',
        textMessageData: {
            textMessage: String(textContent || '').trim()
        }
    }
});

const resolveCustomerPhone = async (payload) => {
    const conversationId = Number.parseInt(String(payload?.conversation?.id || '').trim(), 10);
    const contactIdentifier = String(
        payload?.conversation?.contact_inbox?.source_id ||
        payload?.contact_inbox?.source_id ||
        ''
    ).trim();
    const attachments = extractAttachments(payload);
    const explicitAttachmentPhone = attachments.length > 0
        ? (extractPhoneCandidates(buildTextContent(payload))[0] || null)
        : null;

    if (explicitAttachmentPhone) {
        return explicitAttachmentPhone;
    }

    let user = null;
    if (Number.isFinite(conversationId)) {
        user = await User.findOne({
            where: {
                chatwootConversationId: conversationId
            }
        });
    }

    if (!user && contactIdentifier) {
        user = await User.findOne({
            where: {
                chatwootContactIdentifier: contactIdentifier
            }
        });
    }

    if (user?.phoneNumber) {
        return String(user.phoneNumber).trim();
    }

    const directPhone = normalizePhoneNumber(
        payload?.contact?.phone_number ||
        payload?.contact?.identifier ||
        payload?.contact?.phone ||
        ''
    );
    if (directPhone) {
        return directPhone;
    }

    const textCandidates = [
        buildTextContent(payload),
        ...attachments.map((attachment) => attachment.fileName)
    ];

    for (const candidate of textCandidates) {
        const extractedPhone = extractPhoneCandidates(candidate)[0] || null;
        if (extractedPhone) {
            return extractedPhone;
        }
    }

    return null;
};

const forwardMessageCreatedEvent = async (payload) => {
    const messageId = String(payload?.id || '').trim();
    if (!messageId) {
        return { skipped: true, reason: 'missing_message_id' };
    }

    const existingSync = await ChatwootMessageSync.findOne({
        where: {
            provider: 'chatwoot',
            providerMessageId: messageId
        }
    });
    if (existingSync) {
        return { skipped: true, reason: 'duplicate_message' };
    }

    const customerPhone = await resolveCustomerPhone(payload);
    if (!customerPhone) {
        return { skipped: true, reason: 'customer_phone_not_found' };
    }

    const textContent = buildTextContent(payload);
    const attachments = extractAttachments(payload);
    if (!textContent && attachments.length === 0) {
        return { skipped: true, reason: 'empty_payload' };
    }

    const chatwootContactIdentifier = String(
        payload?.conversation?.contact_inbox?.source_id ||
        payload?.contact_inbox?.source_id ||
        ''
    ).trim() || null;
    const chatwootConversationId = Number.isFinite(Number(payload?.conversation?.id))
        ? Number(payload.conversation.id)
        : null;

    const deliveryResult = await sendNotification.sendChatwootOutbound({
        phoneNumber: customerPhone,
        textContent,
        attachments,
        chatwootMessageId: messageId,
        chatwootContactIdentifier,
        chatwootConversationId
    });

    const providerMessageIds = Array.isArray(deliveryResult?.providerMessageIds)
        ? deliveryResult.providerMessageIds
        : [];
    const providerMessageId = providerMessageIds[providerMessageIds.length - 1] || null;
    const wasQueued = Boolean(deliveryResult?.queued);
    const textSentSeparately = Boolean(deliveryResult?.textSentSeparately);

    const [sync] = await ChatwootMessageSync.findOrCreate({
        where: {
            provider: 'chatwoot',
            providerMessageId: messageId
        },
        defaults: {
            provider: 'chatwoot',
            providerMessageId: messageId,
            customerPhone,
            customerChatId: dialog360Service.normalizePhoneToChatId(customerPhone),
            chatwootContactIdentifier,
            chatwootConversationId,
            chatwootMessageId: providerMessageId
        }
    });

    const syncPatch = {};
    if (!sync.customerPhone && customerPhone) {
        syncPatch.customerPhone = customerPhone;
    }
    if (!sync.customerChatId && customerPhone) {
        syncPatch.customerChatId = dialog360Service.normalizePhoneToChatId(customerPhone);
    }
    if (!sync.chatwootContactIdentifier && chatwootContactIdentifier) {
        syncPatch.chatwootContactIdentifier = chatwootContactIdentifier;
    }
    if (!sync.chatwootConversationId && chatwootConversationId) {
        syncPatch.chatwootConversationId = chatwootConversationId;
    }
    if (providerMessageId && sync.chatwootMessageId !== providerMessageId) {
        syncPatch.chatwootMessageId = providerMessageId;
    }
    if (Object.keys(syncPatch).length > 0) {
        await sync.update(syncPatch);
    }

    if (!wasQueued && textContent && !textSentSeparately && providerMessageId) {
        await processIncomingMessageWebhook(
            buildMessageProcessingContent({
                customerPhone,
                textContent,
                providerMessageId
            })
        );
    }

    return {
        skipped: false,
        queued: wasQueued,
        providerMessageId,
        providerMessageIds,
        customerPhone
    };
};

router.post('/', async (req, res) => {
    if (!verifyWebhookSignature(req)) {
        return res.status(401).json({ ok: false, error: 'invalid_signature' });
    }

    const payload = req.body || {};
    if (!isSupportedOutboundMessage(payload)) {
        return res.status(200).json({ ok: true, skipped: true });
    }

    try {
        const result = await forwardMessageCreatedEvent(payload);
        if (result?.skipped) {
            console.log('[Chatwoot webhook] skipped:', {
                reason: result.reason || 'unknown',
                chatwootMessageId: String(payload?.id || '').trim() || null
            });
        } else {
            console.log('[Chatwoot webhook] sent:', {
                chatwootMessageId: String(payload?.id || '').trim() || null,
                providerMessageId: result?.providerMessageId || null,
                providerMessageIds: result?.providerMessageIds || [],
                customerPhone: result?.customerPhone || null,
                attachments: extractAttachments(payload).length,
                textLength: buildTextContent(payload).length
            });
        }
        return res.status(200).json({ ok: true, ...result });
    } catch (error) {
        console.error('[Chatwoot webhook] Failed to forward outgoing message:', {
            message: error.message,
            status: error.response?.status || null,
            data: error.response?.data || null,
            chatwootMessageId: String(payload?.id || '').trim() || null
        });
        return res.status(500).json({ ok: false, error: 'forward_failed' });
    }
});

module.exports = router;
