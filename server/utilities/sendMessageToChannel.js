const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const buildTelegramOrderMessage = require('./buildTelegramOrderMessage');

const token = String(process.env.TELEGRAM_BOT_TOKEN || '6514524126:AAFCcxHE5q1bDe88cJgmfyUn9-3aHJrwVd0').trim();
const chatId = String(process.env.TELEGRAM_CHAT_ID || '-1002058582331').trim();
const fallbackUrl = String(process.env.TELEGRAM_RELAY_URL || '').trim();
const fallbackSecret = String(process.env.TELEGRAM_RELAY_SECRET || '').trim();

const bot = token ? new TelegramBot(token, { polling: false }) : null;

async function sendViaFallback(message) {
    if (!fallbackUrl || !fallbackSecret) {
        throw new Error('Telegram fallback relay is not configured');
    }

    await axios.post(
        fallbackUrl,
        {
            message,
            chatId
        },
        {
            headers: {
                'x-relay-secret': fallbackSecret
            },
            timeout: 15000
        }
    );
}


async function sendMessageToChannel(order) {
    const message = buildTelegramOrderMessage(order);

    try {
        if (!bot) {
            throw new Error('Telegram bot token is not configured');
        }

        await bot.sendMessage(chatId, message);
        console.log(`Сообщение отправлено в Телеграм канал для заказа ${order.id}`);
        return { ok: true, via: 'primary' };
    } catch (error) {
        console.error(`Ошибка при отправке сообщения в Телеграм для заказа ${order.id}:`, error.message);

        try {
            await sendViaFallback(message);
            console.log(`Сообщение отправлено через fallback relay для заказа ${order.id}`);
            return { ok: true, via: 'fallback' };
        } catch (fallbackError) {
            console.error(`Ошибка fallback relay для заказа ${order.id}:`, fallbackError.message);
            return { ok: false, via: 'none', primaryError: error, fallbackError };
        }
    }
}

module.exports = sendMessageToChannel;
