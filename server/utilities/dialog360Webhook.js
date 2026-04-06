const path = require('path');
const dialog360Service = require('./dialog360Service');

const safeArray = (value) => Array.isArray(value) ? value : [];

const normalizeChatId = (value) => dialog360Service.normalizePhoneToChatId(value);

const buildFileName = (messageType, mediaNode) => {
    const filename = String(mediaNode?.filename || '').trim();
    if (filename) {
        return filename;
    }

    const mimeType = String(mediaNode?.mime_type || '').trim().toLowerCase();
    const knownExt = mimeType === 'application/pdf'
        ? '.pdf'
        : mimeType.startsWith('video/')
            ? '.mp4'
            : mimeType.startsWith('image/')
                ? '.jpg'
                : '';

    return `${messageType || 'file'}-${Date.now()}${knownExt}`;
};

const resolveMediaDownloadUrl = async (mediaNode) => {
    const directUrl =
        String(mediaNode?.url || '').trim() ||
        String(mediaNode?.link || '').trim() ||
        String(mediaNode?.download_url || '').trim();

    if (directUrl) {
        return dialog360Service.normalizeDownloadUrl(directUrl);
    }

    const mediaId = String(mediaNode?.id || '').trim();
    if (!mediaId) {
        return '';
    }

    try {
        return await dialog360Service.getMediaDownloadUrl(mediaId);
    } catch (_error) {
        return '';
    }
};

const buildBaseEvent = ({
    field,
    metadata,
    messageId,
    timestamp,
    outgoing,
    businessPhone,
    peerPhone,
    senderName = ''
}) => {
    const senderPhone = outgoing ? businessPhone : peerPhone;
    const recipientPhone = outgoing ? peerPhone : businessPhone;
    const senderChatId = normalizeChatId(senderPhone);
    const recipientChatId = normalizeChatId(recipientPhone);

    return {
        provider: '360dialog',
        providerField: String(field || '').trim() || 'messages',
        typeWebhook: outgoing ? 'outgoingMessageReceived' : 'incomingMessageReceived',
        idMessage: String(messageId || '').trim() || null,
        timestamp: String(timestamp || '').trim() || null,
        senderPhone: senderPhone || null,
        recipientPhone: recipientPhone || null,
        senderData: {
            chatId: senderChatId || '',
            sender: senderPhone || '',
            senderName: outgoing ? '' : String(senderName || '').trim()
        },
        recipientData: {
            chatId: recipientChatId || '',
            recipient: recipientPhone || ''
        },
        webhookMeta: {
            displayPhoneNumber: String(metadata?.display_phone_number || '').trim() || null,
            phoneNumberId: String(metadata?.phone_number_id || '').trim() || null
        }
    };
};

const mapInteractiveMessage = (message, content) => {
    const interactive = message?.interactive || {};
    const contextId = String(message?.context?.id || '').trim() || null;

    if (interactive?.button_reply) {
        content.messageData = {
            typeMessage: 'buttonsResponseMessage',
            interactiveButtonsResponse: {
                selectedId: String(interactive.button_reply.id || '').trim(),
                selectedDisplayText: String(interactive.button_reply.title || '').trim(),
                stanzaId: contextId
            }
        };

        if (contextId) {
            content.messageData.quotedMessage = {
                stanzaId: contextId
            };
        }

        return content;
    }

    if (interactive?.list_reply) {
        const title = [
            String(interactive.list_reply.title || '').trim(),
            String(interactive.list_reply.description || '').trim()
        ].filter(Boolean).join(' - ');

        content.messageData = {
            typeMessage: 'buttonsResponseMessage',
            interactiveButtonsResponse: {
                selectedId: String(interactive.list_reply.id || '').trim(),
                selectedDisplayText: title,
                stanzaId: contextId
            }
        };

        if (contextId) {
            content.messageData.quotedMessage = {
                stanzaId: contextId
            };
        }
    }

    return content;
};

const mapButtonMessage = (message, content) => {
    const contextId = String(message?.context?.id || '').trim() || null;
    content.messageData = {
        typeMessage: 'buttonsResponseMessage',
        templateButtonReplyMessage: {
            selectedId: String(message?.button?.payload || '').trim(),
            selectedDisplayText: String(message?.button?.text || '').trim(),
            stanzaId: contextId
        }
    };

    if (contextId) {
        content.messageData.quotedMessage = {
            stanzaId: contextId
        };
    }

    return content;
};

const mapMediaMessage = async (message, content) => {
    const mediaNode = message?.[message.type] || {};
    const downloadUrl = await resolveMediaDownloadUrl(mediaNode);
    const mediaPayload = {
        downloadUrl,
        fileName: buildFileName(message.type, mediaNode),
        mimeType: String(mediaNode?.mime_type || '').trim(),
        caption: String(mediaNode?.caption || '').trim(),
        fileBase64: '',
        mediaId: String(mediaNode?.id || '').trim() || null
    };

    if (message.type === 'video') {
        content.messageData = {
            typeMessage: 'videoMessage',
            videoMessage: mediaPayload
        };
        return content;
    }

    content.messageData = {
        typeMessage: 'fileMessage',
        fileMessageData: mediaPayload
    };
    return content;
};

const map360MessageToInternal = async ({ field, metadata, message, contacts = [], outgoing = false }) => {
    const businessPhone = dialog360Service.normalizePhoneToWaId(metadata?.display_phone_number || '');
    const peerPhone = dialog360Service.normalizePhoneToWaId(outgoing ? message?.to : message?.from);
    const senderName = String(contacts?.[0]?.profile?.name || '').trim();

    const content = buildBaseEvent({
        field,
        metadata,
        messageId: message?.id,
        timestamp: message?.timestamp,
        outgoing,
        businessPhone,
        peerPhone,
        senderName
    });

    const messageType = String(message?.type || '').trim();
    if (!messageType) {
        return content;
    }

    if (messageType === 'text') {
        content.messageData = {
            typeMessage: 'textMessage',
            textMessageData: {
                textMessage: String(message?.text?.body || '').trim()
            }
        };
        return content;
    }

    if (messageType === 'interactive') {
        return mapInteractiveMessage(message, content);
    }

    if (messageType === 'button') {
        return mapButtonMessage(message, content);
    }

    if (['image', 'document', 'audio', 'sticker', 'video'].includes(messageType)) {
        return mapMediaMessage(message, content);
    }

    if (messageType === 'reaction') {
        content.messageData = {
            typeMessage: 'reactionMessage',
            reactionMessage: {
                emoji: String(message?.reaction?.emoji || '').trim(),
                stanzaId: String(message?.reaction?.message_id || '').trim() || null
            }
        };
        return content;
    }

    if (messageType === 'location') {
        const location = message?.location || {};
        content.messageData = {
            typeMessage: 'locationMessage',
            locationMessage: {
                latitude: location?.latitude,
                longitude: location?.longitude,
                address: String(location?.address || '').trim(),
                name: String(location?.name || '').trim()
            }
        };
        return content;
    }

    content.messageData = {
        typeMessage: 'unsupportedMessage',
        unsupportedMessage: {
            type: messageType
        }
    };
    return content;
};

const mapStatusToInternal = ({ field, metadata, status }) => ({
    provider: '360dialog',
    providerField: String(field || '').trim() || 'messages',
    providerEventType: 'status',
    type: `status:${String(status?.status || '').trim() || 'unknown'}`,
    idMessage: String(status?.id || '').trim() || null,
    timestamp: String(status?.timestamp || '').trim() || null,
    recipientPhone: dialog360Service.normalizePhoneToWaId(status?.recipient_id || ''),
    recipientData: {
        chatId: normalizeChatId(status?.recipient_id || '')
    },
    statusData: status,
    webhookMeta: {
        displayPhoneNumber: String(metadata?.display_phone_number || '').trim() || null,
        phoneNumberId: String(metadata?.phone_number_id || '').trim() || null
    }
});

const mapHistoryToInternal = ({ change }) => ({
    provider: '360dialog',
    providerField: 'history',
    providerEventType: 'history',
    type: 'history',
    historyData: change?.value?.history || [],
    webhookMeta: {
        event: 'history'
    }
});

const mapAppStateSyncToInternal = ({ change }) => ({
    provider: '360dialog',
    providerField: 'smb_app_state_sync',
    providerEventType: 'smb_app_state_sync',
    type: 'smb_app_state_sync',
    syncData: change?.value || {}
});

const extractEventsFromPayload = async (payload) => {
    if (payload?.object !== 'whatsapp_business_account' || !Array.isArray(payload?.entry)) {
        return [payload];
    }

    const events = [];

    for (const entry of safeArray(payload.entry)) {
        for (const change of safeArray(entry?.changes)) {
            const field = String(change?.field || '').trim();
            const value = change?.value || {};
            const metadata = value?.metadata || {};

            if (field === 'messages') {
                for (const message of safeArray(value?.messages)) {
                    events.push(await map360MessageToInternal({
                        field,
                        metadata,
                        message,
                        contacts: value?.contacts,
                        outgoing: false
                    }));
                }

                for (const status of safeArray(value?.statuses)) {
                    events.push(mapStatusToInternal({ field, metadata, status }));
                }

                continue;
            }

            if (field === 'smb_message_echoes') {
                for (const message of safeArray(value?.message_echoes)) {
                    events.push(await map360MessageToInternal({
                        field,
                        metadata,
                        message,
                        contacts: value?.contacts,
                        outgoing: true
                    }));
                }

                continue;
            }

            if (field === 'history') {
                events.push(mapHistoryToInternal({ change }));
                continue;
            }

            if (field === 'smb_app_state_sync') {
                events.push(mapAppStateSyncToInternal({ change }));
                continue;
            }

            events.push({
                provider: '360dialog',
                providerField: field || 'unknown',
                providerEventType: 'raw_change',
                type: field || 'unknown',
                rawChange: change
            });
        }
    }

    return events.length > 0 ? events : [payload];
};

module.exports = {
    extractEventsFromPayload
};
