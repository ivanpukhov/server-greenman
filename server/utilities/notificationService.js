const axios = require('axios');

const sendNotification = async (phoneNumber, message) => {
    const chatId = `7${phoneNumber}@c.us`;
    const url = `https://api.green-api.com/waInstance1101834631/sendMessage/b6a5812c82f049d28b697b802aa81667c54a6842696c4aac87`;

    const payload = {
        chatId: chatId,
        message: message
    };

    try {
        await axios.post(url, payload);
        console.log('Уведомление отправлено на номер', phoneNumber);
    } catch (error) {
        console.error('Ошибка при отправке уведомления:', error);
    }
};

module.exports = sendNotification;
