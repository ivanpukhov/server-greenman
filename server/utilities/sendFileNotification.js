const QR_MIRROR_PHONE_NUMBER = '77775464450';
const dialog360Service = require('./dialog360Service');

const normalizePhoneToChatId = (phoneNumber) => {
    const digits = String(phoneNumber || '').replace(/\D/g, '');
    if (!digits) {
        throw new Error('Не указан номер телефона для отправки файла');
    }

    const localNumber = digits.length > 10 ? digits.slice(-10) : digits;
    return `7${localNumber}@c.us`;
};

const normalizePhoneCaption = (phoneNumber) => {
    const digits = String(phoneNumber || '').replace(/\D/g, '');
    if (!digits) {
        return '';
    }

    const localNumber = digits.length > 10 ? digits.slice(-10) : digits;
    return `+7${localNumber}`;
};

const sendFileByChatId = async ({ chatId, fileBuffer, fileName, mimeType, caption }) => dialog360Service.sendFileByUpload({
    chatId,
    fileBuffer,
    fileName: fileName || 'order-photo.jpg',
    mimeType,
    caption
});

const sendFileNotification = async ({ phoneNumber, fileBuffer, fileName, mimeType, caption }) => {
    if (!fileBuffer || !Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
        throw new Error('Файл для отправки не передан');
    }

    const recipientChatId = normalizePhoneToChatId(phoneNumber);
    const mirrorChatId = normalizePhoneToChatId(QR_MIRROR_PHONE_NUMBER);
    const resolvedCaption = normalizePhoneCaption(phoneNumber) || String(caption || '').trim();

    const providerResponse = await sendFileByChatId({
        chatId: recipientChatId,
        fileBuffer,
        fileName,
        mimeType,
        caption: resolvedCaption
    });

    if (recipientChatId !== mirrorChatId) {
        await sendFileByChatId({
            chatId: mirrorChatId,
            fileBuffer,
            fileName,
            mimeType,
            caption: resolvedCaption
        });
    }

    return providerResponse;
};

module.exports = sendFileNotification;
