const GREEN_API_MEDIA_URL =
    'https://media.green-api.com/waInstance1101834631/sendFileByUpload/b6a5812c82f049d28b697b802aa81667c54a6842696c4aac87';

const normalizePhoneToChatId = (phoneNumber) => {
    const digits = String(phoneNumber || '').replace(/\D/g, '');
    if (!digits) {
        throw new Error('Не указан номер телефона для отправки файла');
    }

    const localNumber = digits.length > 10 ? digits.slice(-10) : digits;
    return `7${localNumber}@c.us`;
};

const sendFileNotification = async ({ phoneNumber, fileBuffer, fileName, mimeType, caption }) => {
    if (!fileBuffer || !Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
        throw new Error('Файл для отправки не передан');
    }

    const chatId = normalizePhoneToChatId(phoneNumber);
    const form = new FormData();

    form.append('chatId', chatId);
    form.append(
        'file',
        new Blob([fileBuffer], { type: mimeType || 'application/octet-stream' }),
        fileName || 'order-photo.jpg'
    );

    const normalizedCaption = String(caption || '').trim();
    if (normalizedCaption) {
        form.append('caption', normalizedCaption);
    }

    const response = await fetch(GREEN_API_MEDIA_URL, {
        method: 'POST',
        body: form
    });

    const responseBody = await response.json().catch(() => ({}));
    if (!response.ok) {
        const providerError = new Error(responseBody?.message || 'Green API вернул ошибку при отправке файла');
        providerError.status = response.status;
        providerError.responseBody = responseBody;
        throw providerError;
    }

    return responseBody;
};

module.exports = sendFileNotification;
