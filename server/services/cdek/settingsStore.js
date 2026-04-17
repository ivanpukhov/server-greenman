// Lazy-loaded so model is available after DB init
let CdekSettings = null;
const getModel = () => {
    if (!CdekSettings) CdekSettings = require('../../models/orders/CdekSettings');
    return CdekSettings;
};

const cache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

const get = async (key) => {
    const cached = cache.get(key);
    if (cached && Date.now() < cached.expiresAt) return cached.value;

    try {
        const row = await getModel().findOne({ where: { key } });
        const dbValue = row?.value?.trim() || null;
        const value = dbValue || process.env[key] || null;
        cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
        return value;
    } catch (_) {
        return process.env[key] || null;
    }
};

const invalidate = () => cache.clear();

module.exports = { get, invalidate };
