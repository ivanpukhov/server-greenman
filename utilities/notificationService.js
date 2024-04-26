const axios = require('axios');

const sendNotification = async (phoneNumber, message) => {
    const chatId = `7${phoneNumber}@c.us`;
    const url = `https://api.green-api.com/waInstance1101834631/sendMessage/f0aafa8020394baea4aa3db58aeb2afb02afca8b0e9b4ce4b5`;

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
