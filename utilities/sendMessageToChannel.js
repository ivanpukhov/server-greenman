const TelegramBot = require('node-telegram-bot-api');

// Замените 'YOUR_TELEGRAM_BOT_TOKEN' на токен вашего бота
const token = '6514524126:AAFCcxHE5q1bDe88cJgmfyUn9-3aHJrwVd0';
// Замените 'YOUR_CHANNEL_ID' на ID вашего канала или чата
const chatId = '-1002058582331';

const bot = new TelegramBot(token, {polling: false});

async function sendMessageToChannel(order) {
    const message = `Новый заказ:\nID: ${order.id}\nНомер: ${order.phoneNumber}\nКомментарий: ${order.phoneNumber}\nЦена: ${order.totalPrice}\nИмя клиента: ${order.customerName}\nИндекс: ${order.addressIndex}\nГород: ${order.city}\nУлица: ${order.street}\nДом: ${order.houseNumber}\nСпособ доставки: ${order.deliveryMethod}\nСпособ оплаты: ${order.paymentMethod}`;

    try {
        await bot.sendMessage(chatId, message);
        console.log('Сообщение отправлено в Телеграм канал');
    } catch (error) {
        console.error('Ошибка при отправке сообщения в Телеграм:', error);
    }
}

module.exports = sendMessageToChannel;
