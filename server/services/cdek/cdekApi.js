const { getClient } = require('./cdekClient');
const { logError } = require('../../utilities/errorLogger');
const { buildCdekItems } = require('./itemsMapper');
const { buildPackages } = require('./buildPackages');
const { DEFAULT_TARIFF_CODE } = require('./buildOrderPayload');

const TARIFF_CODE = Number(process.env.CDEK_TARIFF_CODE || DEFAULT_TARIFF_CODE);
const CONTRACT_TYPE = 1;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const suggestCities = async (query, { countryCode = 'RU' } = {}) => {
    if (!query || !query.trim()) return [];
    const client = getClient();
    try {
        const response = await client.get('/location/suggest/cities', {
            params: { name: query.trim(), country_code: countryCode }
        });
        return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        logError('cdek.suggestCities', error, {
            query,
            status: error.response?.status,
            data: error.response?.data
        });
        throw error;
    }
};

const calculateTariff = async ({ toCityCode, toAddress, products }) => {
    if (!toCityCode) throw new Error('toCityCode is required');

    const senderCityCode = Number(process.env.CDEK_SENDER_CITY_CODE);
    if (!senderCityCode) throw new Error('CDEK_SENDER_CITY_CODE is not configured');

    const items = buildCdekItems(products || []);
    const packages = buildPackages({ orderNumber: 'calc', items });

    const payload = {
        type: CONTRACT_TYPE,
        tariff_code: TARIFF_CODE,
        from_location: { code: senderCityCode },
        to_location: {
            code: Number(toCityCode),
            address: toAddress || undefined
        },
        packages: packages.map((pkg) => ({
            weight: pkg.weight,
            length: pkg.length,
            width: pkg.width,
            height: pkg.height
        }))
    };

    const client = getClient();
    try {
        const response = await client.post('/calculator/tariff', payload);
        const data = response.data || {};
        return {
            delivery_sum: Number(data.delivery_sum ?? data.total_sum ?? 0),
            total_sum: Number(data.total_sum ?? data.delivery_sum ?? 0),
            period_min: Number(data.period_min ?? data.calendar_min ?? 0),
            period_max: Number(data.period_max ?? data.calendar_max ?? 0),
            tariff_code: TARIFF_CODE,
            currency: data.currency || 'RUB'
        };
    } catch (error) {
        logError('cdek.calculateTariff', error, {
            status: error.response?.status,
            data: error.response?.data,
            toCityCode
        });
        throw error;
    }
};

const createOrder = async (payload) => {
    const client = getClient();
    try {
        const response = await client.post('/orders', payload);
        return response.data;
    } catch (error) {
        logError('cdek.createOrder', error, {
            status: error.response?.status,
            data: error.response?.data,
            number: payload?.number
        });
        throw error;
    }
};

const getOrderByUuid = async (uuid) => {
    const client = getClient();
    try {
        const response = await client.get(`/orders/${uuid}`);
        return response.data;
    } catch (error) {
        logError('cdek.getOrder', error, {
            uuid,
            status: error.response?.status,
            data: error.response?.data
        });
        throw error;
    }
};

const pollOrderUntilRegistered = async (uuid, { timeoutMs = 20000, intervalMs = 2000 } = {}) => {
    const started = Date.now();
    let lastData = null;
    while (Date.now() - started < timeoutMs) {
        try {
            const data = await getOrderByUuid(uuid);
            lastData = data;
            const entity = data?.entity;
            if (entity?.cdek_number) return data;
            const requests = Array.isArray(data?.requests) ? data.requests : [];
            const hasInvalid = requests.some((r) => r?.state === 'INVALID' || r?.errors?.length > 0);
            if (hasInvalid) return data;
        } catch (_error) {
            // ignore and continue polling
        }
        await sleep(intervalMs);
    }
    return lastData;
};

const requestPrint = async (orderUuid, kind) => {
    const client = getClient();
    const endpoint = kind === 'barcode' ? '/print/barcodes' : '/print/orders';
    try {
        const response = await client.post(endpoint, {
            orders: [{ order_uuid: orderUuid }],
            copies: 1,
            format: kind === 'barcode' ? 'A6' : undefined
        });
        return response.data;
    } catch (error) {
        logError('cdek.requestPrint', error, {
            orderUuid,
            kind,
            status: error.response?.status,
            data: error.response?.data
        });
        throw error;
    }
};

const getPrintForm = async (formUuid, kind) => {
    const client = getClient();
    const endpoint = kind === 'barcode' ? `/print/barcodes/${formUuid}` : `/print/orders/${formUuid}`;
    try {
        const response = await client.get(endpoint);
        return response.data;
    } catch (error) {
        logError('cdek.getPrintForm', error, {
            formUuid,
            kind,
            status: error.response?.status,
            data: error.response?.data
        });
        throw error;
    }
};

const pollPrintReady = async (formUuid, kind, { timeoutMs = 60000, intervalMs = 2500 } = {}) => {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
        const data = await getPrintForm(formUuid, kind);
        const status = data?.entity?.statuses?.[0]?.code || data?.entity?.status;
        const url = data?.entity?.url;
        if ((status === 'READY' || status === 'DONE') && url) {
            return { url, data };
        }
        if (status === 'INVALID' || status === 'REMOVED') {
            throw new Error(`CDEK print form is ${status}`);
        }
        await sleep(intervalMs);
    }
    throw new Error('CDEK print form polling timed out');
};

const downloadPrintPdfStream = async (pdfUrl) => {
    const client = getClient();
    try {
        const response = await client.get(pdfUrl, {
            responseType: 'stream',
            baseURL: ''
        });
        return response;
    } catch (error) {
        logError('cdek.downloadPrintPdfStream', error, {
            pdfUrl,
            status: error.response?.status
        });
        throw error;
    }
};

const createIntake = async (payload) => {
    const client = getClient();
    try {
        const response = await client.post('/intakes', payload);
        return response.data;
    } catch (error) {
        logError('cdek.createIntake', error, {
            status: error.response?.status,
            data: error.response?.data
        });
        throw error;
    }
};

const subscribeWebhook = async ({ url, type = 'ORDER_STATUS' }) => {
    const client = getClient();
    try {
        const response = await client.post('/webhooks', { url, type });
        return response.data;
    } catch (error) {
        logError('cdek.subscribeWebhook', error, {
            status: error.response?.status,
            data: error.response?.data
        });
        throw error;
    }
};

module.exports = {
    suggestCities,
    calculateTariff,
    createOrder,
    getOrderByUuid,
    pollOrderUntilRegistered,
    requestPrint,
    getPrintForm,
    pollPrintReady,
    downloadPrintPdfStream,
    createIntake,
    subscribeWebhook
};
