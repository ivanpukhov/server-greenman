const CdekSettings = require('../../models/orders/CdekSettings');
const { get: getSetting, invalidate } = require('../../services/cdek/settingsStore');
const { invalidateToken } = require('../../services/cdek/tokenStore');
const { logError } = require('../../utilities/errorLogger');

const CDEK_KEYS = [
    'CDEK_BASE_URL',
    'CDEK_CLIENT_ID',
    'CDEK_CLIENT_SECRET',
    'CDEK_SENDER_CITY_CODE',
    'CDEK_SENDER_ADDRESS',
    'CDEK_SENDER_NAME',
    'CDEK_SENDER_PHONE',
    'CDEK_SENDER_EMAIL',
    'CDEK_SENDER_COMPANY',
    'CDEK_TARIFF_CODE'
];

const SECRET_PLACEHOLDER = '••••••••';

const getSettings = async (req, res) => {
    try {
        const rows = await CdekSettings.findAll({ where: { key: CDEK_KEYS } });
        const map = Object.fromEntries(CDEK_KEYS.map((k) => [k, '']));
        rows.forEach((r) => { map[r.key] = r.value || ''; });
        if (map.CDEK_CLIENT_SECRET) map.CDEK_CLIENT_SECRET = SECRET_PLACEHOLDER;
        res.json({ data: map });
    } catch (error) {
        logError('cdekSettings.get', error);
        res.status(500).json({ message: error.message });
    }
};

const updateSettings = async (req, res) => {
    try {
        const updates = req.body || {};
        for (const key of CDEK_KEYS) {
            if (!Object.prototype.hasOwnProperty.call(updates, key)) continue;
            const val = String(updates[key] || '').trim();
            if (key === 'CDEK_CLIENT_SECRET' && val === SECRET_PLACEHOLDER) continue;
            await CdekSettings.upsert({ key, value: val || null });
        }
        invalidate();
        res.json({ data: { ok: true } });
    } catch (error) {
        logError('cdekSettings.update', error);
        res.status(500).json({ message: error.message });
    }
};

const testConnection = async (req, res) => {
    invalidate();
    invalidateToken();

    const steps = [];
    try {
        const baseUrl = await getSetting('CDEK_BASE_URL');
        const clientId = await getSetting('CDEK_CLIENT_ID');
        const clientSecret = await getSetting('CDEK_CLIENT_SECRET');
        const senderCity = await getSetting('CDEK_SENDER_CITY_CODE');

        steps.push({ step: 'settings', baseUrl, clientId: clientId ? '✓' : '✗ отсутствует', clientSecret: clientSecret ? '✓' : '✗ отсутствует', senderCity });

        if (!baseUrl || !clientId || !clientSecret) {
            return res.status(400).json({ ok: false, steps, error: 'Не заполнены обязательные поля: CDEK_BASE_URL, CDEK_CLIENT_ID, CDEK_CLIENT_SECRET' });
        }

        const axios = require('axios');
        // CDEK: base URL already contains /v2, so oauth/token is appended to it
        const base = baseUrl.replace(/\/$/, '');
        const tokenUrl = `${base}/oauth/token`;
        steps.push({ step: 'urls', tokenUrl, suggestUrl: `${base}/location/suggest/cities` });

        const params = new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret });

        let tokenData;
        try {
            const tokenRes = await axios.post(tokenUrl, params.toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 15000
            });
            tokenData = tokenRes.data;
            steps.push({ step: 'token', ok: true, token_type: tokenData.token_type, expires_in: tokenData.expires_in });
        } catch (e) {
            steps.push({ step: 'token', ok: false, status: e.response?.status, cdek_error: e.response?.data, message: e.message });
            return res.status(502).json({ ok: false, steps, error: `Ошибка получения токена СДЭК: ${e.response?.data?.error_description || e.response?.data?.message || e.message}` });
        }

        try {
            const suggestRes = await axios.get(`${base}/location/suggest/cities`, {
                params: { name: 'Омск', country_code: 'RU' },
                headers: { Authorization: `Bearer ${tokenData.access_token}` },
                timeout: 15000
            });
            const data = suggestRes.data;
            const list = Array.isArray(data) ? data : (data?.cities || data?.data || []);
            steps.push({ step: 'suggest_cities', ok: true, response_type: Array.isArray(data) ? 'array' : typeof data, count: list.length, first: list[0] || null });
            res.json({ ok: true, steps });
        } catch (e) {
            steps.push({ step: 'suggest_cities', ok: false, status: e.response?.status, cdek_error: e.response?.data, message: e.message });
            res.status(502).json({ ok: false, steps, error: `Токен получен, но запрос городов вернул ошибку: ${e.response?.data?.message || e.message}` });
        }
    } catch (error) {
        logError('cdekSettings.test', error);
        res.status(500).json({ ok: false, steps, error: error.message });
    }
};

module.exports = { getSettings, updateSettings, testConnection };
