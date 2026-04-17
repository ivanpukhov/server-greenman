const CdekSettings = require('../../models/orders/CdekSettings');
const { invalidate } = require('../../services/cdek/settingsStore');
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

module.exports = { getSettings, updateSettings };
