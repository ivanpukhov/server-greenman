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

const chatIdToPhone = (chatId) => {
    const value = String(chatId || '').trim();
    if (!value) {
        return null;
    }
    const digits = value.replace(/\D/g, '');
    return digits || null;
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
};

const extractMessageText = (messageNode = {}) => {
    if (!messageNode || typeof messageNode !== 'object') {
        return '';
    }

    if (messageNode.conversation) return String(messageNode.conversation);
    if (messageNode.extendedTextMessage?.text) return String(messageNode.extendedTextMessage.text);
    if (messageNode.imageMessage?.caption) return String(messageNode.imageMessage.caption);
    if (messageNode.videoMessage?.caption) return String(messageNode.videoMessage.caption);
    if (messageNode.documentMessage?.caption) return String(messageNode.documentMessage.caption);
    if (messageNode.buttonsResponseMessage?.selectedDisplayText) {
        return String(messageNode.buttonsResponseMessage.selectedDisplayText);
    }
    if (messageNode.listResponseMessage?.title) return String(messageNode.listResponseMessage.title);
    if (messageNode.templateButtonReplyMessage?.selectedDisplayText) {
        return String(messageNode.templateButtonReplyMessage.selectedDisplayText);
    }

    return '';
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

const getFileNameFromMessageNode = (messageNode = {}) => {
    if (messageNode.documentMessage?.fileName) {
        return String(messageNode.documentMessage.fileName);
    }
    if (messageNode.videoMessage) {
        return `video-${Date.now()}.mp4`;
    }
    if (messageNode.imageMessage) {
        return `image-${Date.now()}.jpg`;
    }
    return 'file';
};

const getMimeTypeFromMessageNode = (messageNode = {}) => {
    if (messageNode.documentMessage?.mimetype) {
        return String(messageNode.documentMessage.mimetype);
    }
    if (messageNode.videoMessage?.mimetype) {
        return String(messageNode.videoMessage.mimetype);
    }
    if (messageNode.imageMessage?.mimetype) {
        return String(messageNode.imageMessage.mimetype);
    }
    return null;
};

const extractMediaSummary = (messageNode = {}) => {
    if (messageNode.documentMessage) return 'document';
    if (messageNode.videoMessage) return 'video';
    if (messageNode.imageMessage) return 'image';
    if (messageNode.audioMessage) return 'audio';
    return null;
};

const safeDownloadMediaBuffer = async (msg) => {
    if (!socket) {
        return null;
    }

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
    } catch (_error) {
        return null;
    }
};

const buildWebhookPayloadFromMessage = async (msg) => {
    const message = msg?.message || {};
    const text = extractMessageText(message);
    const fromMe = Boolean(msg?.key?.fromMe);
    const remoteJid = normalizeChatId(msg?.key?.remoteJid);
    const ownJid = normalizeChatId(socket?.user?.id);
    const senderChatId = fromMe ? ownJid || remoteJid : remoteJid;
    const recipientChatId = fromMe ? remoteJid : ownJid || remoteJid;
    const senderPhone = chatIdToPhone(senderChatId);
    const recipientPhone = chatIdToPhone(recipientChatId);

    const payload = {
        idMessage: String(msg?.key?.id || '').trim() || null,
        typeWebhook: fromMe ? 'outgoingMessageReceived' : 'incomingMessageReceived',
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
        if (isPdf) {
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

const processByWebhookBridge = async (msg) => {
    if (typeof webhookProcessor !== 'function') {
        return;
    }

    try {
        const payload = await buildWebhookPayloadFromMessage(msg);
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

const clearReconnectTimer = () => {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
};

const scheduleReconnect = () => {
    clearReconnectTimer();
    reconnectTimer = setTimeout(() => {
        startSession().catch((error) => {
            state.lastError = String(error?.message || error);
            markUpdated();
        });
    }, 2500);
};

const onConnectionUpdate = async (update) => {
    const connection = String(update?.connection || '').trim();
    const qr = typeof update?.qr === 'string' ? update.qr : null;
    const statusCode = update?.lastDisconnect?.error?.output?.statusCode || null;

    if (qr) {
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
        state.connection = 'open';
        state.lastError = null;
        state.lastDisconnectReason = null;
        state.qr = null;
        state.qrImageDataUrl = null;
        markUpdated();
    }

    if (connection === 'close') {
        state.connection = 'closed';
        state.lastDisconnectReason = statusCode;
        state.lastError = statusCode ? `connection closed (${statusCode})` : 'connection closed';
        markUpdated();

        if (!isStopping) {
            scheduleReconnect();
        }
    }
};

const onMessagesUpsert = async (payload) => {
    const list = Array.isArray(payload?.messages) ? payload.messages : [];
    for (const msg of list) {
        const messageNode = msg?.message;
        if (!messageNode) {
            continue;
        }

        const chatId = normalizeChatId(msg?.key?.remoteJid);
        const ownChatId = normalizeChatId(socket?.user?.id);
        const fromMe = Boolean(msg?.key?.fromMe);
        const text = extractMessageText(messageNode);
        const mediaType = extractMediaSummary(messageNode);
        const notificationType = fromMe ? 'outgoingMessageReceived' : 'incomingMessageReceived';
        const fromChatId = fromMe ? ownChatId || chatId : chatId;
        const toChatId = fromMe ? chatId : ownChatId || chatId;
        const fromPhone = chatIdToPhone(fromChatId);
        const toPhone = chatIdToPhone(toChatId);

        console.log(
            `[Baileys][message] type=${notificationType} from=${fromPhone || fromChatId} to=${toPhone || toChatId} id=${String(msg?.key?.id || '')} text="${truncateText(text)}"${mediaType ? ` media=${mediaType}` : ''}`
        );

        addEvent({
            type: 'message.notification',
            direction: fromMe ? 'outgoing' : 'incoming',
            webhookType: notificationType,
            chatId,
            fromChatId,
            toChatId,
            fromPhone,
            toPhone,
            messageId: String(msg?.key?.id || '').trim() || null,
            text: text || null,
            mediaType,
            raw: cloneSafe({
                upsertType: payload?.type || null,
                key: msg?.key || null,
                message: messageNode
            })
        });

        await processByWebhookBridge(msg);
    }
};

const startSession = async () => {
    if (connectingPromise) {
        return connectingPromise;
    }

    connectingPromise = (async () => {
        clearReconnectTimer();
        isStopping = false;
        state.connection = 'connecting';
        state.lastError = null;
        if (!state.startedAt) {
            state.startedAt = new Date().toISOString();
        }
        markUpdated();

        fs.mkdirSync(AUTH_DIR, { recursive: true });

        const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
        const { version } = await fetchLatestBaileysVersion();
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
        connectingPromise = null;
    }
};

const stopSession = async () => {
    isStopping = true;
    clearReconnectTimer();
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
    markUpdated();
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
    waitForQr,
    getStatus,
    getEvents,
    setWebhookProcessor,
    autoStartIfAuthenticated
};
