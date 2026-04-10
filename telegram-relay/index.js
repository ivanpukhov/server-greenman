const express = require('express');
const axios = require('axios');

const app = express();

const port = Number(process.env.PORT || 3011);
const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
const defaultChatId = String(process.env.TELEGRAM_CHAT_ID || '').trim();
const sharedSecret = String(process.env.RELAY_SHARED_SECRET || '').trim();

app.use(express.json({ limit: '128kb' }));

app.get('/health', (_req, res) => {
    res.json({ ok: true });
});

app.post('/send', async (req, res) => {
    const authHeader = String(req.headers['x-relay-secret'] || '').trim();
    if (!sharedSecret || authHeader !== sharedSecret) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    if (!token) {
        return res.status(500).json({ ok: false, error: 'TELEGRAM_BOT_TOKEN is not configured' });
    }

    const body = req.body || {};
    const message = String(body.message || '').trim();
    const chatId = String(body.chatId || defaultChatId).trim();

    if (!message) {
        return res.status(400).json({ ok: false, error: 'Message is required' });
    }

    if (!chatId) {
        return res.status(500).json({ ok: false, error: 'TELEGRAM_CHAT_ID is not configured' });
    }

    try {
        const response = await axios.post(
            `https://api.telegram.org/bot${token}/sendMessage`,
            {
                chat_id: chatId,
                text: message
            },
            {
                timeout: 15000
            }
        );

        res.json({
            ok: true,
            telegramOk: response.data && response.data.ok === true,
            result: (response.data && response.data.result) || null
        });
    } catch (error) {
        const status = (error.response && error.response.status) || 500;
        res.status(status).json({
            ok: false,
            error: (error.response && error.response.data) || error.message
        });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Telegram relay listening on port ${port}`);
});
