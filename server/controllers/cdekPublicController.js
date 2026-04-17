const cdekApi = require('../services/cdek/cdekApi');
const ProductType = require('../models/ProductType');
const Product = require('../models/Product');
const CdekWebhookEvent = require('../models/orders/CdekWebhookEvent');
const Order = require('../models/orders/Order');
const { logError } = require('../utilities/errorLogger');

const suggestCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_MAX_SIZE = 1000;

const getFromCache = (key) => {
    const entry = suggestCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        suggestCache.delete(key);
        return null;
    }
    return entry.value;
};

const setCache = (key, value) => {
    if (suggestCache.size >= CACHE_MAX_SIZE) {
        const firstKey = suggestCache.keys().next().value;
        if (firstKey) suggestCache.delete(firstKey);
    }
    suggestCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
};

const suggestCities = async (req, res) => {
    const query = String(req.query.q || '').trim();
    if (query.length < 2) {
        return res.json([]);
    }

    const cacheKey = query.toLowerCase();
    const cached = getFromCache(cacheKey);
    if (cached) {
        return res.json(cached);
    }

    try {
        const cities = await cdekApi.suggestCities(query);
        const mapped = cities.map((city) => ({
            code: city.code,
            city: city.city,
            region: city.region,
            full_name: city.full_name || `${city.city}, ${city.region || ''}`.trim(),
            country_code: city.country_code
        }));
        setCache(cacheKey, mapped);
        res.json(mapped);
    } catch (error) {
        const cdekDetail = error.response?.data?.message || error.response?.data?.error_description || error.response?.data?.error || null;
        logError('cdekPublic.suggestCities', error, { query, cdekStatus: error.response?.status, cdekDetail });
        res.status(502).json({
            error: 'Не удалось получить список городов СДЭК',
            detail: cdekDetail || error.message,
            cdekStatus: error.response?.status
        });
    }
};

const calculate = async (req, res) => {
    try {
        const { toCityCode, toAddress, products } = req.body || {};
        if (!toCityCode) {
            return res.status(400).json({ error: 'toCityCode is required' });
        }
        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ error: 'products array is required' });
        }

        const typeIds = products
            .map((p) => Number(p.productTypeId))
            .filter((id) => Number.isFinite(id));

        if (typeIds.length === 0) {
            return res.status(400).json({ error: 'products must contain productTypeId' });
        }

        const types = await ProductType.findAll({
            where: { id: typeIds },
            include: [{ model: Product }]
        });
        const typeMap = new Map(types.map((t) => [t.id, t]));

        const canonicalProducts = products.map((p) => {
            const type = typeMap.get(Number(p.productTypeId));
            if (!type) return null;
            return {
                name: type.Product?.name || '',
                type: { id: type.id, type: type.type, price: type.price },
                quantity: Math.max(1, Number(p.quantity || 1))
            };
        }).filter(Boolean);

        if (canonicalProducts.length === 0) {
            return res.status(400).json({ error: 'Не найдены указанные товары' });
        }

        const result = await cdekApi.calculateTariff({
            toCityCode: Number(toCityCode),
            toAddress: toAddress || undefined,
            products: canonicalProducts
        });

        res.json(result);
    } catch (error) {
        logError('cdekPublic.calculate', error, {
            status: error.response?.status,
            data: error.response?.data
        });
        res.status(502).json({ error: 'Не удалось рассчитать доставку СДЭК' });
    }
};

const webhook = async (req, res) => {
    res.status(200).json({ ok: true });

    setImmediate(async () => {
        try {
            const payload = req.body || {};
            const uuid = payload.attributes?.uuid || payload.uuid;
            const cdekNumber = payload.attributes?.cdek_number || payload.cdek_number;
            const statusCode = payload.attributes?.code || payload.type;
            const dateTime = payload.date_time || payload.attributes?.date_time;

            await CdekWebhookEvent.create({
                uuid: uuid || null,
                cdekNumber: cdekNumber || null,
                statusCode: statusCode || null,
                dateTime: dateTime || null,
                rawPayload: JSON.stringify(payload),
                processed: false
            });

            if (!uuid) return;

            const order = await Order.findOne({ where: { cdekUuid: uuid } });
            if (!order) return;

            const patch = {};
            if (statusCode) patch.cdekStatus = statusCode;
            if (cdekNumber && !order.cdekNumber) patch.cdekNumber = cdekNumber;

            const deliveredCodes = new Set(['DELIVERED']);
            const returnedCodes = new Set(['NOT_DELIVERED', 'RETURNED_TO_SENDER']);
            if (deliveredCodes.has(statusCode)) patch.status = 'Доставлено';
            else if (returnedCodes.has(statusCode)) patch.status = 'Отменено';

            if (Object.keys(patch).length > 0) {
                await order.update(patch);
            }
        } catch (error) {
            logError('cdekPublic.webhook.process', error);
        }
    });
};

module.exports = {
    suggestCities,
    calculate,
    webhook
};
