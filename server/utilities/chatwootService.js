const axios = require('axios');
const User = require('../models/orders/User');
const ChatwootMessageSync = require('../models/orders/ChatwootMessageSync');
const { normalizePhoneNumber } = require('./paymentLinkUtils');
const {
    CHATWOOT_BASE_URL,
    CHATWOOT_API_INBOX_IDENTIFIER,
    CHATWOOT_ENABLED
} = require('../config/chatwoot');

const REQUEST_TIMEOUT_MS = 15000;

const isConfigured = () => Boolean(
    CHATWOOT_ENABLED &&
    CHATWOOT_BASE_URL &&
    CHATWOOT_API_INBOX_IDENTIFIER
);

const trimTrailingSlash = (value) => String(value || '').replace(/\/+$/, '');

const buildApiUrl = (pathSuffix) => (
    `${trimTrailingSlash(CHATWOOT_BASE_URL)}/public/api/v1/inboxes/${encodeURIComponent(CHATWOOT_API_INBOX_IDENTIFIER)}${pathSuffix}`
);

const buildPhoneNumberForChatwoot = (phoneNumber) => {
    const normalized = normalizePhoneNumber(phoneNumber);
    return normalized ? `+7${normalized}` : '';
};

const toSafeInteger = (value) => {
    const parsed = Number.parseInt(String(value || '').trim(), 10);
    return Number.isFinite(parsed) ? parsed : null;
};

const getTextFromContent = (content) => (
    content?.messageData?.extendedTextMessageData?.text ||
    content?.messageData?.textMessageData?.textMessage ||
    ''
);

const buildInboundMessageText = (content) => {
    const textMessage = String(getTextFromContent(content) || '').trim();
    if (textMessage) {
        return textMessage;
    }

    const templateReply = content?.messageData?.templateButtonReplyMessage || null;
    if (templateReply) {
        const selectedText = String(templateReply.selectedDisplayText || '').trim();
        const selectedId = String(templateReply.selectedId || '').trim();
        return selectedText || (selectedId ? `[Кнопка] ${selectedId}` : '[Нажата кнопка]');
    }

    const interactiveReply = content?.messageData?.interactiveButtonsResponse || null;
    if (interactiveReply) {
        const selectedText = String(interactiveReply.selectedDisplayText || '').trim();
        const selectedId = String(interactiveReply.selectedId || '').trim();
        return selectedText || (selectedId ? `[Интерактивный ответ] ${selectedId}` : '[Интерактивный ответ]');
    }

    const fileMessage = content?.messageData?.fileMessageData || null;
    if (fileMessage) {
        const lines = ['[Файл]'];
        const fileName = String(fileMessage.fileName || '').trim();
        const caption = String(fileMessage.caption || '').trim();
        const downloadUrl = String(fileMessage.downloadUrl || '').trim();

        if (fileName) {
            lines.push(`Имя файла: ${fileName}`);
        }
        if (caption) {
            lines.push(`Подпись: ${caption}`);
        }
        if (downloadUrl) {
            lines.push(`Ссылка: ${downloadUrl}`);
        }

        return lines.join('\n');
    }

    const videoMessage = content?.messageData?.videoMessage || null;
    if (videoMessage) {
        const lines = ['[Видео]'];
        const fileName = String(videoMessage.fileName || '').trim();
        const caption = String(videoMessage.caption || '').trim();
        const downloadUrl = String(videoMessage.downloadUrl || '').trim();

        if (fileName) {
            lines.push(`Имя файла: ${fileName}`);
        }
        if (caption) {
            lines.push(`Подпись: ${caption}`);
        }
        if (downloadUrl) {
            lines.push(`Ссылка: ${downloadUrl}`);
        }

        return lines.join('\n');
    }

    const locationMessage = content?.messageData?.locationMessage || null;
    if (locationMessage) {
        const lines = ['[Локация]'];
        const name = String(locationMessage.name || '').trim();
        const address = String(locationMessage.address || '').trim();
        const latitude = locationMessage.latitude;
        const longitude = locationMessage.longitude;

        if (name) {
            lines.push(`Название: ${name}`);
        }
        if (address) {
            lines.push(`Адрес: ${address}`);
        }
        if (latitude !== undefined && longitude !== undefined) {
            lines.push(`Координаты: ${latitude}, ${longitude}`);
        }

        return lines.join('\n');
    }

    const reactionMessage = content?.messageData?.reactionMessage || null;
    if (reactionMessage) {
        const emoji = String(reactionMessage.emoji || '').trim();
        return emoji ? `[Реакция] ${emoji}` : '[Реакция]';
    }

    const unsupportedType = String(content?.messageData?.unsupportedMessage?.type || '').trim();
    if (unsupportedType) {
        return `[Неподдерживаемый тип сообщения] ${unsupportedType}`;
    }

    return '';
};

const buildContactName = ({ senderName, phoneNumber }) => {
    const normalizedName = String(senderName || '').trim();
    if (normalizedName) {
        return normalizedName;
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    return normalizedPhone ? `WhatsApp ${normalizedPhone}` : 'WhatsApp contact';
};

const buildContactCustomAttributes = ({ senderChatId, customerPhone }) => ({
    source: '360dialog',
    whatsapp_chat_id: senderChatId,
    customer_phone: customerPhone
});

const createContact = async ({ identifier, name, phoneNumber, customAttributes = {} }) => {
    const payload = {
        identifier: String(identifier || '').trim(),
        name: String(name || '').trim(),
        phone_number: buildPhoneNumberForChatwoot(phoneNumber),
        custom_attributes: customAttributes
    };

    const response = await axios.post(
        buildApiUrl('/contacts'),
        payload,
        {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: REQUEST_TIMEOUT_MS
        }
    );

    return response.data || {};
};

const createContactIdentifier = async ({ customerPhone, senderName, senderChatId }) => {
    const createdContact = await createContact({
        identifier: customerPhone,
        name: buildContactName({ senderName, phoneNumber: customerPhone }),
        phoneNumber: customerPhone,
        customAttributes: buildContactCustomAttributes({
            senderChatId,
            customerPhone
        })
    });

    return String(createdContact?.source_id || '').trim();
};

const listConversations = async (contactIdentifier) => {
    const response = await axios.get(
        buildApiUrl(`/contacts/${encodeURIComponent(contactIdentifier)}/conversations`),
        { timeout: REQUEST_TIMEOUT_MS }
    );

    return Array.isArray(response.data) ? response.data : [];
};

const createConversation = async (contactIdentifier, customAttributes = {}) => {
    const response = await axios.post(
        buildApiUrl(`/contacts/${encodeURIComponent(contactIdentifier)}/conversations`),
        {
            custom_attributes: customAttributes
        },
        {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: REQUEST_TIMEOUT_MS
        }
    );

    return response.data || {};
};

const createMessage = async ({ contactIdentifier, conversationId, content, echoId }) => {
    const response = await axios.post(
        buildApiUrl(`/contacts/${encodeURIComponent(contactIdentifier)}/conversations/${conversationId}/messages`),
        {
            content,
            echo_id: echoId
        },
        {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: REQUEST_TIMEOUT_MS
        }
    );

    return response.data || {};
};

const saveUserChatwootState = async (user, patch) => {
    const nextPatch = {};

    if (
        patch.chatwootContactIdentifier &&
        patch.chatwootContactIdentifier !== user.chatwootContactIdentifier
    ) {
        nextPatch.chatwootContactIdentifier = patch.chatwootContactIdentifier;
    }

    if (
        patch.chatwootConversationId &&
        Number(patch.chatwootConversationId) !== Number(user.chatwootConversationId)
    ) {
        nextPatch.chatwootConversationId = Number(patch.chatwootConversationId);
    }

    if (Object.keys(nextPatch).length > 0) {
        await user.update(nextPatch);
    }
};

const resolveConversationId = async (contactIdentifier) => {
    const conversations = await listConversations(contactIdentifier);
    const latestConversationId = conversations
        .map((conversation) => toSafeInteger(conversation?.id))
        .filter(Boolean)
        .sort((left, right) => right - left)[0] || null;

    if (latestConversationId) {
        return latestConversationId;
    }

    const createdConversation = await createConversation(contactIdentifier, {
        source: '360dialog',
        bridge: 'server-greenman'
    });

    return toSafeInteger(createdConversation?.id);
};

const ensureChatwootConversation = async ({ user, customerPhone, senderName, senderChatId }) => {
    let contactIdentifier = String(user.chatwootContactIdentifier || '').trim();
    let conversationId = toSafeInteger(user.chatwootConversationId);

    if (!contactIdentifier) {
        contactIdentifier = await createContactIdentifier({
            customerPhone,
            senderName,
            senderChatId
        });
    }

    if (!contactIdentifier) {
        throw new Error('Chatwoot did not return contact source_id');
    }

    if (!conversationId) {
        try {
            conversationId = await resolveConversationId(contactIdentifier);
        } catch (error) {
            if (error.response?.status !== 404) {
                throw error;
            }

            contactIdentifier = await createContactIdentifier({
                customerPhone,
                senderName,
                senderChatId
            });
            conversationId = await resolveConversationId(contactIdentifier);
        }
    }

    if (!conversationId) {
        throw new Error('Chatwoot conversation id is empty');
    }

    await saveUserChatwootState(user, {
        chatwootContactIdentifier: contactIdentifier,
        chatwootConversationId: conversationId
    });

    return {
        contactIdentifier,
        conversationId
    };
};

const findOrCreateCustomerUser = async ({ customerPhone }) => {
    let user = await User.findOne({
        where: {
            phoneNumber: customerPhone
        }
    });

    if (!user) {
        user = await User.create({
            phoneNumber: customerPhone
        });
    }

    return user;
};

const syncIncomingMessage = async (content) => {
    if (!isConfigured()) {
        return { skipped: true, reason: 'chatwoot_not_configured' };
    }

    const webhookType = String(content?.typeWebhook || '').trim();
    if (webhookType !== 'incomingMessageReceived') {
        return { skipped: true, reason: 'not_incoming' };
    }

    const senderChatId = String(content?.senderData?.chatId || '').trim();
    if (!senderChatId.endsWith('@c.us')) {
        return { skipped: true, reason: 'unsupported_chat' };
    }

    const customerPhone = normalizePhoneNumber(
        content?.senderPhone ||
        content?.senderData?.sender ||
        senderChatId
    );
    if (!customerPhone) {
        return { skipped: true, reason: 'phone_not_normalized' };
    }

    const providerMessageId = String(content?.idMessage || '').trim();
    if (providerMessageId) {
        const existingSync = await ChatwootMessageSync.findOne({
            where: {
                provider: '360dialog',
                providerMessageId
            }
        });

        if (existingSync) {
            return { skipped: true, reason: 'duplicate_message' };
        }
    }

    const messageText = buildInboundMessageText(content);
    if (!messageText) {
        return { skipped: true, reason: 'empty_message' };
    }

    const user = await findOrCreateCustomerUser({ customerPhone });
    const senderName = String(content?.senderData?.senderName || '').trim();
    const chatwootState = await ensureChatwootConversation({
        user,
        customerPhone,
        senderName,
        senderChatId
    });

    let createdMessage;
    try {
        createdMessage = await createMessage({
            contactIdentifier: chatwootState.contactIdentifier,
            conversationId: chatwootState.conversationId,
            content: messageText,
            echoId: providerMessageId || `d360-${Date.now()}`
        });
    } catch (error) {
        if (error.response?.status !== 404) {
            throw error;
        }

        let nextContactIdentifier = chatwootState.contactIdentifier;
        let nextConversationId;
        try {
            nextConversationId = await resolveConversationId(nextContactIdentifier);
        } catch (conversationError) {
            if (conversationError.response?.status !== 404) {
                throw conversationError;
            }

            nextContactIdentifier = await createContactIdentifier({
                customerPhone,
                senderName,
                senderChatId
            });
            nextConversationId = await resolveConversationId(nextContactIdentifier);
        }

        await saveUserChatwootState(user, {
            chatwootContactIdentifier: nextContactIdentifier,
            chatwootConversationId: nextConversationId
        });

        createdMessage = await createMessage({
            contactIdentifier: nextContactIdentifier,
            conversationId: nextConversationId,
            content: messageText,
            echoId: providerMessageId || `d360-${Date.now()}`
        });
        chatwootState.contactIdentifier = nextContactIdentifier;
        chatwootState.conversationId = nextConversationId;
    }

    if (providerMessageId) {
        await ChatwootMessageSync.create({
            provider: '360dialog',
            providerMessageId,
            customerPhone,
            customerChatId: senderChatId,
            chatwootContactIdentifier: chatwootState.contactIdentifier,
            chatwootConversationId: chatwootState.conversationId,
            chatwootMessageId: String(createdMessage?.id || '').trim() || null
        });
    }

    return {
        skipped: false,
        contactIdentifier: chatwootState.contactIdentifier,
        conversationId: chatwootState.conversationId,
        messageId: createdMessage?.id || null
    };
};

const syncIncomingMessageSafe = async (content) => {
    try {
        return await syncIncomingMessage(content);
    } catch (error) {
        console.error('[Chatwoot sync] Failed to sync incoming WhatsApp message:', {
            message: error.message,
            status: error.response?.status || null,
            data: error.response?.data || null,
            providerMessageId: String(content?.idMessage || '').trim() || null
        });
        return { skipped: true, reason: 'sync_failed' };
    }
};

module.exports = {
    isConfigured,
    syncIncomingMessage,
    syncIncomingMessageSafe
};
