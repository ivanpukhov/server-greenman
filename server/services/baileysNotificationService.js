const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const pino = require('pino');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    downloadMediaMessage
} = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');

const AUTH_DIR = path.resolve(__dirname, '../data/baileys-auth');
const EVENTS_BUFFER_LIMIT = 500;
const QR_WAIT_TIMEOUT_MS = 25000;
const LID_RETRY_ATTEMPTS = 8;
const LID_RETRY_DELAY_MIN_MS = 250;
const LID_RETRY_DELAY_MAX_MS = 500;
const LID_DEFERRED_MAX_ATTEMPTS = 120;
const LID_DEFERRED_DELAY_MS = 3000;
const WEBHOOK_DEDUP_TTL_MS = 1000 * 60 * 60 * 6;

let socket = null;
let saveCredsRef = null;
let webhookProcessor = null;
let connectingPromise = null;
let isStopping = false;
let reconnectTimer = null;
let eventSeq = 0;

const events = [];
const emitter = new EventEmitter();
const state = {
    connection: 'idle',
    qr: null,
    qrImageDataUrl: null,
    lastError: null,
    startedAt: null,
    updatedAt: null,
    lastDisconnectReason: null
};

const markUpdated = () => {
    state.updatedAt = new Date().toISOString();
};

const logBaileys = (message, meta = null) => {
    if (meta && Object.keys(meta).length > 0) {
        console.log(`[Baileys][session] ${message} ${JSON.stringify(meta)}`);
        return;
    }
    console.log(`[Baileys][session] ${message}`);
};

const cloneSafe = (value) => {
    try {
        return JSON.parse(
            JSON.stringify(value, (_key, currentValue) =>
                typeof currentValue === 'bigint' ? String(currentValue) : currentValue
            )
        );
    } catch (_error) {
        return null;
    }
};

const normalizeChatId = (jid) => {
    const raw = String(jid || '').trim();
    if (!raw) {
        return '';
    }

    const sanitized = raw.replace(/:\d+(?=@)/, '');

    if (sanitized.endsWith('@s.whatsapp.net')) {
        return `${sanitized.slice(0, -'@s.whatsapp.net'.length)}@c.us`;
    }

    return sanitized;
};

const isLidChatId = (chatId) => {
    const normalized = String(chatId || '').trim();
    return normalized.endsWith('@lid') || normalized.endsWith('@hosted.lid');
};

const lidToPnCache = new Map();
const deferredResolveQueue = new Map();
const processedWebhookKeys = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomBetween = (min, max) => min + Math.floor(Math.random() * (Math.max(min, max) - min + 1));

const isPnChatId = (chatId) => {
    const normalized = String(chatId || '').trim();
    return normalized.endsWith('@c.us') || normalized.endsWith('@s.whatsapp.net') || normalized.endsWith('@hosted');
};

const isGroupChatId = (chatId) => {
    const normalized = String(chatId || '').trim();
    return normalized.endsWith('@g.us');
};

const toNormalizedJid = (value) => {
    const raw = String(value || '').trim();
    if (!raw || !raw.includes('@')) {
        return null;
    }
    return normalizeChatId(raw);
};

const pickBestRemoteJidFromKey = (key = {}) => {
    const remoteRaw = String(key?.remoteJid || '').trim();
    const remoteAltRaw = String(key?.remoteJidAlt || '').trim();

    // Rule: client phone is whichever field contains @s.whatsapp.net
    if (remoteRaw.includes('@s.whatsapp.net')) {
        return normalizeChatId(remoteRaw);
    }
    if (remoteAltRaw.includes('@s.whatsapp.net')) {
        return normalizeChatId(remoteAltRaw);
    }

    const remote = toNormalizedJid(remoteRaw);
    const remoteAlt = toNormalizedJid(remoteAltRaw);
    if (remote && isPnChatId(remote)) return remote;
    if (remoteAlt && isPnChatId(remoteAlt)) return remoteAlt;
    return remote || remoteAlt || '';
};

const logResolverSuccess = (source, jid) => {
    const digits = String(jid || '').replace(/\D/g, '');
    console.log(`[resolver] LID resolved via ${source} -> ${digits || jid}`);
};

const extractJidsFromStore = () => {
    const out = new Set();
    collectJidsDeep(socket?.store?.contacts, out);
    collectJidsDeep(socket?.store?.chats, out);
    return Array.from(out);
};

const cacheResolvedPair = (lidJid, pnJid) => {
    const lid = normalizeChatId(lidJid);
    const pn = normalizeChatId(pnJid);
    if (!isLidChatId(lid) || !isPnChatId(pn)) {
        return false;
    }
    lidToPnCache.set(lid, pn);
    return true;
};

const resolvePnChatIdFromLid = async (chatId, context = {}) => {
    const normalized = normalizeChatId(chatId);
    if (!isLidChatId(normalized)) {
        return { jid: normalized, source: 'direct' };
    }

    const cached = lidToPnCache.get(normalized);
    if (cached && isPnChatId(cached)) {
        return { jid: cached, source: 'cache' };
    }

    const resolver = socket?.signalRepository?.lidMapping?.getPNForLID;
    if (typeof resolver === 'function') {
        try {
            const mapped = normalizeChatId(await resolver(normalized));
            if (mapped && isPnChatId(mapped)) {
                cacheResolvedPair(normalized, mapped);
                return { jid: mapped, source: 'lidMapping' };
            }
        } catch (_error) {
            // noop
        }
    }

    const candidates = new Set();
    const contextInfoCandidates = new Set();
    const participantCandidates = new Set();
    const storeCandidates = new Set();
    const messageNode = context?.messageNode || null;
    const msg = context?.msg || null;
    const remoteJidAlt = toNormalizedJid(msg?.key?.remoteJidAlt);
    if (remoteJidAlt && isPnChatId(remoteJidAlt)) {
        cacheResolvedPair(normalized, remoteJidAlt);
        return { jid: remoteJidAlt, source: 'participant' };
    }

    const addCandidate = (value, targetSet = candidates) => {
        const normalizedValue = toNormalizedJid(value);
        if (normalizedValue) {
            targetSet.add(normalizedValue);
            candidates.add(normalizedValue);
        }
    };

    addCandidate(msg?.key?.participant, participantCandidates);
    addCandidate(msg?.participant, participantCandidates);
    addCandidate(socket?.user?.id);

    if (messageNode) {
        const contextInfo =
            messageNode?.extendedTextMessage?.contextInfo ||
            messageNode?.imageMessage?.contextInfo ||
            messageNode?.videoMessage?.contextInfo ||
            messageNode?.documentMessage?.contextInfo ||
            messageNode?.buttonsResponseMessage?.contextInfo ||
            messageNode?.listResponseMessage?.contextInfo ||
            messageNode?.templateButtonReplyMessage?.contextInfo ||
            null;

        collectJidsDeep(contextInfo, contextInfoCandidates);
        collectJidsDeep(messageNode?.deviceListMetadata, contextInfoCandidates);
        collectJidsDeep(messageNode?.quotedMessage, contextInfoCandidates);
        collectJidsDeep(messageNode, candidates);
    }

    for (const value of contextInfoCandidates) {
        candidates.add(value);
    }
    const storeJids = extractJidsFromStore();
    for (const value of storeJids) {
        storeCandidates.add(value);
        candidates.add(value);
    }

    const tryCandidateSet = (set, source) => {
        for (const candidate of set) {
            if (isPnChatId(candidate)) {
                cacheResolvedPair(normalized, candidate);
                return { jid: candidate, source };
            }
        }
        return null;
    };

    const byParticipant = tryCandidateSet(participantCandidates, 'participant');
    if (byParticipant) {
        return byParticipant;
    }
    const byContext = tryCandidateSet(contextInfoCandidates, 'context');
    if (byContext) {
        return byContext;
    }
    const byContacts = tryCandidateSet(new Set(
        Array.from(storeCandidates).filter((item) => String(item).includes('@c.us'))
    ), 'contacts');
    if (byContacts) {
        return byContacts;
    }
    const byChats = tryCandidateSet(new Set(
        Array.from(storeCandidates).filter((item) => String(item).includes('@s.whatsapp.net') || String(item).includes('@c.us'))
    ), 'chats');
    if (byChats) {
        return byChats;
    }

    return { jid: normalized, source: null };
};

const resolvePnChatIdFromLidWithRetries = async (chatId, context = {}) => {
    let current = normalizeChatId(chatId);
    if (!isLidChatId(current)) {
        return { jid: current, source: 'direct', attempts: 0 };
    }

    let resolvedSource = null;
    for (let attempt = 1; attempt <= LID_RETRY_ATTEMPTS; attempt += 1) {
        const result = await resolvePnChatIdFromLid(current, context);
        current = normalizeChatId(result?.jid || current);
        resolvedSource = result?.source || resolvedSource;
        if (resolvedSource) {
            logResolverSuccess(resolvedSource, current);
        }
        if (!isLidChatId(current)) {
            return { jid: current, source: resolvedSource || 'retry', attempts: attempt };
        }
        if (attempt < LID_RETRY_ATTEMPTS) {
            console.log(`[resolver] retry ${attempt}/${LID_RETRY_ATTEMPTS} for ${current}`);
            await sleep(randomBetween(LID_RETRY_DELAY_MIN_MS, LID_RETRY_DELAY_MAX_MS));
        }
    }

    return { jid: current, source: resolvedSource || 'retry', attempts: LID_RETRY_ATTEMPTS };
};

const chatIdToPhone = (chatId) => {
    const value = String(chatId || '').trim();
    if (!value) {
        return null;
    }
    if (isLidChatId(value)) {
        return null;
    }
    const digits = value.replace(/\D/g, '');
    return digits.length >= 10 ? digits : null;
};

const updateEventById = (eventId, patch) => {
    if (!eventId) {
        return null;
    }
    const index = events.findIndex((eventItem) => Number(eventItem?.id) === Number(eventId));
    if (index < 0) {
        return null;
    }

    events[index] = {
        ...events[index],
        ...patch,
        updatedAt: new Date().toISOString()
    };
    return events[index];
};

const collectJidsDeep = (source, out, depth = 0, seen = new WeakSet()) => {
    if (depth > 8 || source === null || source === undefined) {
        return;
    }
    if (typeof source === 'string') {
        const matches = source.match(/[0-9A-Za-z_.:-]+@[0-9A-Za-z_.-]+/g) || [];
        for (const value of matches) {
            const normalized = toNormalizedJid(value);
            if (normalized) {
                out.add(normalized);
            }
        }
        return;
    }
    if (Array.isArray(source)) {
        for (const item of source) {
            collectJidsDeep(item, out, depth + 1, seen);
        }
        return;
    }
    if (typeof source === 'object') {
        if (seen.has(source)) {
            return;
        }
        seen.add(source);
        for (const key of Object.keys(source)) {
            collectJidsDeep(source[key], out, depth + 1, seen);
        }
    }
};

const addEvent = (event) => {
    eventSeq += 1;
    const normalized = {
        id: eventSeq,
        time: new Date().toISOString(),
        ...event
    };
    events.push(normalized);
    if (events.length > EVENTS_BUFFER_LIMIT) {
        events.splice(0, events.length - EVENTS_BUFFER_LIMIT);
    }
    emitter.emit('event', normalized);
    return normalized;
};

const extractMessageText = (messageNode = {}) => {
    const node = unwrapMessageNode(messageNode);
    if (!node || typeof node !== 'object') {
        return '';
    }

    if (node.conversation) return String(node.conversation);
    if (node.extendedTextMessage?.text) return String(node.extendedTextMessage.text);
    if (node.imageMessage?.caption) return String(node.imageMessage.caption);
    if (node.videoMessage?.caption) return String(node.videoMessage.caption);
    if (node.documentMessage?.caption) return String(node.documentMessage.caption);
    if (node.buttonsResponseMessage?.selectedDisplayText) {
        return String(node.buttonsResponseMessage.selectedDisplayText);
    }
    if (node.listResponseMessage?.title) return String(node.listResponseMessage.title);
    if (node.templateButtonReplyMessage?.selectedDisplayText) {
        return String(node.templateButtonReplyMessage.selectedDisplayText);
    }

    return '';
};

const unwrapMessageNode = (messageNode = {}) => {
    let current = messageNode;
    let guard = 0;

    while (current && typeof current === 'object' && guard < 10) {
        guard += 1;
        if (current.documentWithCaptionMessage?.message) {
            current = current.documentWithCaptionMessage.message;
            continue;
        }
        if (current.ephemeralMessage?.message) {
            current = current.ephemeralMessage.message;
            continue;
        }
        if (current.viewOnceMessage?.message) {
            current = current.viewOnceMessage.message;
            continue;
        }
        if (current.viewOnceMessageV2?.message) {
            current = current.viewOnceMessageV2.message;
            continue;
        }
        if (current.viewOnceMessageV2Extension?.message) {
            current = current.viewOnceMessageV2Extension.message;
            continue;
        }
        if (current.editedMessage?.message) {
            current = current.editedMessage.message;
            continue;
        }
        break;
    }

    return current || messageNode;
};

const truncateText = (value, max = 120) => {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!text) {
        return '';
    }
    if (text.length <= max) {
        return text;
    }
    return `${text.slice(0, max)}...`;
};

const normalizeMessageTimestamp = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.trunc(value);
    }

    if (typeof value === 'bigint') {
        return Number(value);
    }

    if (value && typeof value === 'object') {
        if (typeof value.toNumber === 'function') {
            const converted = value.toNumber();
            if (Number.isFinite(converted)) {
                return Math.trunc(converted);
            }
        }

        if ('low' in value && Number.isFinite(Number(value.low))) {
            return Math.trunc(Number(value.low));
        }
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
};

const getFileNameFromMessageNode = (messageNode = {}) => {
    const node = unwrapMessageNode(messageNode);
    if (node.documentMessage?.fileName) {
        return String(node.documentMessage.fileName);
    }
    if (node.videoMessage) {
        return `video-${Date.now()}.mp4`;
    }
    if (node.imageMessage) {
        return `image-${Date.now()}.jpg`;
    }
    return 'file';
};

const getMimeTypeFromMessageNode = (messageNode = {}) => {
    const node = unwrapMessageNode(messageNode);
    if (node.documentMessage?.mimetype) {
        return String(node.documentMessage.mimetype);
    }
    if (node.videoMessage?.mimetype) {
        return String(node.videoMessage.mimetype);
    }
    if (node.imageMessage?.mimetype) {
        return String(node.imageMessage.mimetype);
    }
    return null;
};

const extractMediaSummary = (messageNode = {}) => {
    const node = unwrapMessageNode(messageNode);
    if (node.documentMessage) return 'document';
    if (node.videoMessage) return 'video';
    if (node.imageMessage) return 'image';
    if (node.audioMessage) return 'audio';
    return null;
};

const safeDownloadMediaBuffer = async (msg) => {
    if (!socket) {
        return null;
    }

    const hasDocumentWithCaption = Boolean(
        msg?.message?.documentWithCaptionMessage?.message?.documentMessage
    );

    try {
        const buffer = await downloadMediaMessage(
            msg,
            'buffer',
            {},
            {
                logger: pino({ level: 'silent' }),
                reuploadRequest: socket.updateMediaMessage
            }
        );
        return Buffer.isBuffer(buffer) ? buffer : null;
    } catch (firstError) {
        // Fallback for wrapped media nodes (documentWithCaptionMessage / viewOnce / ephemeral)
        try {
            const unwrapped = unwrapMessageNode(msg?.message || {});
            const fallbackMsg = {
                ...msg,
                message: unwrapped
            };
            const buffer = await downloadMediaMessage(
                fallbackMsg,
                'buffer',
                {},
                {
                    logger: pino({ level: 'silent' }),
                    reuploadRequest: socket.updateMediaMessage
                }
            );
            if (hasDocumentWithCaption) {
                const fileName =
                    msg?.message?.documentWithCaptionMessage?.message?.documentMessage?.fileName ||
                    'file.pdf';
                console.log(`[Baileys][pdf] extracted from documentWithCaptionMessage: ${fileName}`);
            }
            return Buffer.isBuffer(buffer) ? buffer : null;
        } catch (_secondError) {
            console.log(
                `[Baileys][pdf] download failed: ${String(firstError?.message || firstError)}`
            );
            return null;
        }
    }
};

const buildWebhookPayloadFromMessage = async (msg, resolvedJids = {}) => {
    const rawMessage = msg?.message || {};
    const message = unwrapMessageNode(rawMessage);
    const text = extractMessageText(message);
    const fromMe = Boolean(msg?.key?.fromMe);
    const remoteJidRaw = pickBestRemoteJidFromKey(msg?.key || {});
    const remoteJid = normalizeChatId(
        resolvedJids.remoteJid || (await resolvePnChatIdFromLidWithRetries(remoteJidRaw, { msg, messageNode: message })).jid
    );
    const ownJid = normalizeChatId(
        resolvedJids.ownJid || (await resolvePnChatIdFromLidWithRetries(normalizeChatId(socket?.user?.id), { msg, messageNode: message })).jid
    );
    const senderChatId = fromMe ? ownJid || remoteJid : remoteJid;
    const recipientChatId = fromMe ? remoteJid : ownJid || remoteJid;
    const senderPhone = chatIdToPhone(senderChatId);
    const recipientPhone = chatIdToPhone(recipientChatId);

    const payload = {
        idMessage: String(msg?.key?.id || '').trim() || null,
        messageTimestamp: normalizeMessageTimestamp(msg?.messageTimestamp),
        typeWebhook: fromMe ? 'outgoingMessageReceived' : 'incomingMessageReceived',
        chatId: recipientChatId,
        senderPhone,
        recipientPhone,
        senderData: {
            chatId: senderChatId,
            sender: senderPhone
        },
        recipientData: {
            chatId: recipientChatId,
            recipient: recipientPhone
        },
        messageData: {}
    };

    if (text) {
        payload.messageData.textMessageData = {
            textMessage: text
        };
        payload.messageData.extendedTextMessageData = {
            text
        };
    }

    const mediaType = extractMediaSummary(message);
    const documentMessage = message?.documentMessage;
    const videoMessage = message?.videoMessage;
    const imageMessage = message?.imageMessage;
    if (documentMessage || videoMessage || imageMessage) {
        const baseDownloadUrl = String(
            documentMessage?.url ||
            videoMessage?.url ||
            imageMessage?.url ||
            ''
        ).trim() || null;
        const fileName = getFileNameFromMessageNode(message);
        const mimeType = getMimeTypeFromMessageNode(message);
        const fileData = {
            fileName,
            mimeType,
            caption: String(
                documentMessage?.caption ||
                videoMessage?.caption ||
                imageMessage?.caption ||
                ''
            ).trim() || null,
            downloadUrl: baseDownloadUrl
        };
        const isPdf = String(fileData.mimeType || '').toLowerCase().includes('pdf') ||
            String(fileData.fileName || '').toLowerCase().endsWith('.pdf');
        const shouldAttachBinary = isPdf || mediaType === 'video';
        if (shouldAttachBinary) {
            const mediaBuffer = await safeDownloadMediaBuffer(msg);
            if (mediaBuffer) {
                fileData.fileBase64 = mediaBuffer.toString('base64');
            }
        }
        payload.messageData.fileMessageData = {
            ...fileData
        };
        if (mediaType === 'video') {
            payload.messageData.videoMessage = {
                ...fileData
            };
        }
    }

    return payload;
};

const processByWebhookBridge = async (msg, resolvedJids = {}) => {
    if (typeof webhookProcessor !== 'function') {
        return;
    }

    try {
        const payload = await buildWebhookPayloadFromMessage(msg, resolvedJids);
        await webhookProcessor(payload, { source: 'baileys' });
    } catch (error) {
        addEvent({
            type: 'bridge.error',
            level: 'error',
            error: String(error?.message || error),
            raw: cloneSafe({
                stack: error?.stack || null
            })
        });
    }
};

const deleteMessageForCurrentSession = async ({ chatId, messageId, fromMe = false, participant = null, timestamp = null }) => {
    const normalizedChatId = normalizeChatId(chatId);
    const normalizedMessageId = String(messageId || '').trim();
    const normalizedTimestamp = normalizeMessageTimestamp(timestamp);

    if (!socket) {
        throw new Error('Baileys session is not active');
    }

    if (!normalizedChatId) {
        throw new Error('chatId is required to delete message');
    }

    if (!normalizedMessageId) {
        throw new Error('messageId is required to delete message');
    }

    const messageKey = {
        remoteJid: normalizedChatId,
        fromMe: Boolean(fromMe),
        id: normalizedMessageId
    };

    const normalizedParticipant = normalizeChatId(participant);
    if (normalizedParticipant && isGroupChatId(normalizedChatId)) {
        messageKey.participant = normalizedParticipant;
    }

    if (fromMe) {
        await socket.sendMessage(normalizedChatId, {
            delete: messageKey
        });
    } else {
        if (!normalizedTimestamp) {
            throw new Error('timestamp is required to delete incoming message for current session');
        }

        await socket.chatModify({
            deleteForMe: {
                deleteMedia: false,
                key: messageKey,
                timestamp: normalizedTimestamp
            }
        }, normalizedChatId, []);
    }

    addEvent({
        type: 'message.delete',
        level: 'info',
        chatId: normalizedChatId,
        messageId: normalizedMessageId,
        fromMe: Boolean(fromMe),
        participant: normalizedParticipant || null,
        messageTimestamp: normalizedTimestamp
    });

    return {
        ok: true,
        method: fromMe ? 'delete' : 'deleteForMe',
        chatId: normalizedChatId,
        messageId: normalizedMessageId,
        messageTimestamp: normalizedTimestamp,
        fromMe: Boolean(fromMe),
        participant: normalizedParticipant || null
    };
};

const clearReconnectTimer = () => {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
};

const scheduleReconnect = () => {
    clearReconnectTimer();
    logBaileys('scheduleReconnect', {
        delayMs: 2500,
        lastDisconnectReason: state.lastDisconnectReason
    });
    reconnectTimer = setTimeout(() => {
        startSession().catch((error) => {
            state.lastError = String(error?.message || error);
            logBaileys('reconnect failed', {
                error: String(error?.message || error)
            });
            markUpdated();
        });
    }, 2500);
};

const onConnectionUpdate = async (update) => {
    const connection = String(update?.connection || '').trim();
    const qr = typeof update?.qr === 'string' ? update.qr : null;
    const statusCode = update?.lastDisconnect?.error?.output?.statusCode || null;
    const updateSocket = update?.socket || update?.ws || null;

    if (connection || qr || statusCode) {
        logBaileys('connection.update', {
            connection: connection || null,
            hasQr: Boolean(qr),
            lastDisconnectReason: statusCode
        });
        addEvent({
            type: 'connection.update',
            level: connection === 'close' ? 'warning' : 'info',
            connection: connection || null,
            hasQr: Boolean(qr),
            lastDisconnectReason: statusCode
        });
    }

    if (qr) {
        logBaileys('qr received', {
            length: qr.length
        });
        state.connection = 'qr';
        state.qr = qr;
        state.lastError = null;
        try {
            state.qrImageDataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 360 });
        } catch (_error) {
            state.qrImageDataUrl = null;
        }
        markUpdated();
        emitter.emit('qr', state.qrImageDataUrl || qr);
    }

    if (connection === 'open') {
        logBaileys('connection opened');
        state.connection = 'open';
        state.lastError = null;
        state.lastDisconnectReason = null;
        state.qr = null;
        state.qrImageDataUrl = null;
        markUpdated();
    }

    if (connection === 'close') {
        logBaileys('connection closed', {
            statusCode
        });
        if (!updateSocket || socket === updateSocket) {
            socket = null;
            saveCredsRef = null;
        }
        state.connection = 'closed';
        state.lastDisconnectReason = statusCode;
        state.lastError = statusCode ? `connection closed (${statusCode})` : 'connection closed';
        markUpdated();

        if (!isStopping) {
            scheduleReconnect();
        }
    }
};

const getDeferredMessageKey = (msg) => {
    const remoteJid = pickBestRemoteJidFromKey(msg?.key || {});
    const explicitId = String(msg?.key?.id || '').trim();
    if (explicitId) {
        return `${remoteJid}|${explicitId}`;
    }
    const timestamp = String(msg?.messageTimestamp || '').trim();
    const fromMe = msg?.key?.fromMe ? '1' : '0';
    const fallback = `${remoteJid}|${fromMe}|${timestamp || 'no-ts'}`;
    return fallback;
};

const cleanupWebhookDedupe = () => {
    const now = Date.now();
    for (const [key, timestamp] of processedWebhookKeys.entries()) {
        if (now - timestamp > WEBHOOK_DEDUP_TTL_MS) {
            processedWebhookKeys.delete(key);
        }
    }
};

const scheduleDeferredResolution = ({ msg, upsertType, eventId, attempt }) => {
    const messageKey = getDeferredMessageKey(msg);
    if (attempt >= LID_DEFERRED_MAX_ATTEMPTS) {
        deferredResolveQueue.delete(messageKey);
        return;
    }

    if (deferredResolveQueue.has(messageKey)) {
        return;
    }

    const timer = setTimeout(async () => {
        deferredResolveQueue.delete(messageKey);

        const messageNode = msg?.message;
        if (!messageNode) {
            return;
        }

        const resolvedRemote = await resolvePnChatIdFromLidWithRetries(normalizeChatId(msg?.key?.remoteJid), { msg, messageNode });
        const resolvedOwn = await resolvePnChatIdFromLidWithRetries(normalizeChatId(socket?.user?.id), { msg, messageNode });
        const remoteChatId = normalizeChatId(resolvedRemote.jid);
        const ownChatId = normalizeChatId(resolvedOwn.jid);
        const fromMe = Boolean(msg?.key?.fromMe);
        const fromChatId = fromMe ? ownChatId || remoteChatId : remoteChatId;
        const toChatId = fromMe ? remoteChatId : ownChatId || remoteChatId;
        const fromPhone = chatIdToPhone(fromChatId);
        const toPhone = chatIdToPhone(toChatId);

        if (fromPhone || toPhone || !isLidChatId(remoteChatId)) {
            updateEventById(eventId, {
                chatId: remoteChatId,
                fromChatId,
                toChatId,
                fromPhone,
                toPhone,
                resolutionSource: 'retry'
            });
            return;
        }

        scheduleDeferredResolution({
            msg,
            upsertType,
            eventId,
            attempt: attempt + 1
        });
    }, LID_DEFERRED_DELAY_MS);

    deferredResolveQueue.set(messageKey, timer);
};

const processSingleUpsertMessage = async (msg, upsertType) => {
    const messageNode = msg?.message;
    if (!messageNode) {
        return;
    }

    console.log('[Baileys][notification][raw]\n' + JSON.stringify(cloneSafe(msg), null, 2));

    const chatIdRaw = pickBestRemoteJidFromKey(msg?.key || {});
    const resolvedRemote = await resolvePnChatIdFromLidWithRetries(chatIdRaw, { msg, messageNode });
    const resolvedOwn = await resolvePnChatIdFromLidWithRetries(normalizeChatId(socket?.user?.id), { msg, messageNode });
    const chatId = normalizeChatId(resolvedRemote.jid);
    const ownChatId = normalizeChatId(resolvedOwn.jid);

    const fromMe = Boolean(msg?.key?.fromMe);
    const text = extractMessageText(messageNode);
    const mediaType = extractMediaSummary(messageNode);
    const notificationType = fromMe ? 'outgoingMessageReceived' : 'incomingMessageReceived';
    const fromChatId = fromMe ? ownChatId || chatId : chatId;
    const toChatId = fromMe ? chatId : ownChatId || chatId;
    const fromPhone = chatIdToPhone(fromChatId);
    const toPhone = chatIdToPhone(toChatId);

    console.log(
        `[Baileys][message] type=${notificationType} from=${fromPhone || 'unknown'} to=${toPhone || 'unknown'} id=${String(msg?.key?.id || '')} text="${truncateText(text)}"${mediaType ? ` media=${mediaType}` : ''}`
    );

    const createdEvent = addEvent({
        type: 'message.notification',
        direction: fromMe ? 'outgoing' : 'incoming',
        webhookType: notificationType,
        chatId,
        fromChatId,
        toChatId,
        fromPhone,
        toPhone,
        resolutionSource: resolvedRemote.source || null,
        messageId: String(msg?.key?.id || '').trim() || null,
        text: text || null,
        mediaType,
        raw: cloneSafe({
            upsertType,
            key: msg?.key || null,
            message: messageNode
        })
    });

    cleanupWebhookDedupe();
    const webhookKey = getDeferredMessageKey(msg);
    if (!processedWebhookKeys.has(webhookKey)) {
        processedWebhookKeys.set(webhookKey, Date.now());
        await processByWebhookBridge(msg, {
            remoteJid: chatId,
            ownJid: ownChatId
        });
    }

    if (!fromPhone || !toPhone || isLidChatId(chatId)) {
        scheduleDeferredResolution({
            msg,
            upsertType,
            eventId: createdEvent?.id || null,
            attempt: 1
        });
    }
};

const onMessagesUpsert = async (payload) => {
    const list = Array.isArray(payload?.messages) ? payload.messages : [];
    for (const msg of list) {
        await processSingleUpsertMessage(msg, payload?.type || null);
    }
};

const startSession = async () => {
    if (socket && ['connecting', 'qr', 'open'].includes(state.connection)) {
        logBaileys('startSession skipped because socket is already active', {
            connection: state.connection
        });
        return;
    }

    if (connectingPromise) {
        logBaileys('startSession joined existing connectingPromise');
        return connectingPromise;
    }

    connectingPromise = (async () => {
        clearReconnectTimer();
        isStopping = false;
        logBaileys('startSession begin', {
            hasAuthState: hasAuthState()
        });
        state.connection = 'connecting';
        state.lastError = null;
        if (!state.startedAt) {
            state.startedAt = new Date().toISOString();
        }
        markUpdated();

        fs.mkdirSync(AUTH_DIR, { recursive: true });

        const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
        const { version } = await fetchLatestBaileysVersion();
        logBaileys('creating socket', {
            version
        });
        const sock = makeWASocket({
            auth: authState,
            version,
            printQRInTerminal: false,
            browser: ['Greenman', 'Chrome', '1.0.0'],
            logger: pino({ level: 'silent' })
        });

        socket = sock;
        saveCredsRef = saveCreds;

        sock.ev.on('connection.update', (update) => {
            onConnectionUpdate(update).catch((error) => {
                state.lastError = String(error?.message || error);
                markUpdated();
            });
        });
        sock.ev.on('creds.update', saveCreds);
        sock.ev.on('messages.upsert', (payload) => {
            onMessagesUpsert(payload).catch((error) => {
                addEvent({
                    type: 'messages.upsert.error',
                    level: 'error',
                    error: String(error?.message || error)
                });
            });
        });
    })();

    try {
        await connectingPromise;
    } finally {
        logBaileys('startSession finished', {
            connection: state.connection
        });
        connectingPromise = null;
    }
};

const stopSession = async () => {
    isStopping = true;
    clearReconnectTimer();
    logBaileys('stopSession begin', {
        hadSocket: Boolean(socket)
    });
    for (const timer of deferredResolveQueue.values()) {
        clearTimeout(timer);
    }
    deferredResolveQueue.clear();
    if (!socket) {
        state.connection = 'idle';
        markUpdated();
        return;
    }

    try {
        socket.end(new Error('manual-stop'));
    } catch (_error) {
        // noop
    }
    socket = null;
    saveCredsRef = null;
    state.connection = 'idle';
    state.qr = null;
    state.qrImageDataUrl = null;
    logBaileys('stopSession finished');
    markUpdated();
};

const clearAuthState = () => {
    try {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        logBaileys('auth state cleared', {
            authDir: AUTH_DIR
        });
    } catch (_error) {
        // noop
    }
};

const logoutSession = async () => {
    isStopping = true;
    clearReconnectTimer();
    logBaileys('logoutSession begin', {
        hadSocket: Boolean(socket)
    });
    for (const timer of deferredResolveQueue.values()) {
        clearTimeout(timer);
    }
    deferredResolveQueue.clear();

    if (socket) {
        try {
            if (typeof socket.logout === 'function') {
                await socket.logout();
            } else {
                socket.end(new Error('manual-logout'));
            }
        } catch (_error) {
            // noop
        }
    }

    socket = null;
    saveCredsRef = null;
    clearAuthState();

    state.connection = 'idle';
    state.qr = null;
    state.qrImageDataUrl = null;
    state.lastError = null;
    state.lastDisconnectReason = null;
    state.startedAt = null;
    logBaileys('logoutSession finished');
    markUpdated();
};

const restartSession = async () => {
    logBaileys('restartSession begin');
    await stopSession();
    await startSession();
    logBaileys('restartSession finished', {
        connection: state.connection
    });
};

const resetSessionForQr = async () => {
    logBaileys('resetSessionForQr begin');
    await stopSession();
    clearAuthState();
    state.connection = 'idle';
    state.qr = null;
    state.qrImageDataUrl = null;
    state.lastError = null;
    state.lastDisconnectReason = null;
    state.startedAt = null;
    markUpdated();
    await startSession();
    logBaileys('resetSessionForQr finished', {
        connection: state.connection
    });
};

const waitForQr = async (timeoutMs = QR_WAIT_TIMEOUT_MS) => {
    if (state.qrImageDataUrl || state.qr) {
        return state.qrImageDataUrl || state.qr;
    }

    await new Promise((resolve) => {
        const timer = setTimeout(() => {
            emitter.off('qr', onQr);
            resolve();
        }, timeoutMs);

        const onQr = () => {
            clearTimeout(timer);
            emitter.off('qr', onQr);
            resolve();
        };

        emitter.on('qr', onQr);
    });

    return state.qrImageDataUrl || state.qr || null;
};

const getStatus = () => ({
    connection: state.connection,
    qrAvailable: Boolean(state.qr || state.qrImageDataUrl),
    qrImageDataUrl: state.qrImageDataUrl,
    startedAt: state.startedAt,
    updatedAt: state.updatedAt,
    lastError: state.lastError,
    lastDisconnectReason: state.lastDisconnectReason
});

const getEvents = ({ sinceId = 0, limit = 100 } = {}) => {
    const normalizedSinceId = Math.max(0, Number(sinceId) || 0);
    const normalizedLimit = Math.max(1, Math.min(500, Number(limit) || 100));
    const filtered = events.filter((event) => event.id > normalizedSinceId);
    if (filtered.length <= normalizedLimit) {
        return filtered;
    }
    return filtered.slice(filtered.length - normalizedLimit);
};

const hasAuthState = () => {
    try {
        if (!fs.existsSync(AUTH_DIR)) {
            return false;
        }

        const files = fs.readdirSync(AUTH_DIR);
        return files.length > 0;
    } catch (_error) {
        return false;
    }
};

const autoStartIfAuthenticated = async () => {
    if (!hasAuthState()) {
        return false;
    }

    await startSession();
    return true;
};

const setWebhookProcessor = (processor) => {
    webhookProcessor = typeof processor === 'function' ? processor : null;
};

module.exports = {
    startSession,
    stopSession,
    restartSession,
    resetSessionForQr,
    logoutSession,
    waitForQr,
    getStatus,
    getEvents,
    setWebhookProcessor,
    autoStartIfAuthenticated,
    deleteMessageForCurrentSession
};
