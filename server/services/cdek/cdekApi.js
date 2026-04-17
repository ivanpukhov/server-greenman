const { getClient } = require('./cdekClient');
const { get: getSetting } = require('./settingsStore');
const { logError } = require('../../utilities/errorLogger');
const { buildCdekItems } = require('./itemsMapper');
const { buildPackages } = require('./buildPackages');
const { DEFAULT_TARIFF_CODE, DEFAULT_PVZ_TARIFF_CODE } = require('./buildOrderPayload');
const { normalizeCdekMoneyToRub } = require('./pricing');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const suggestCities = async (query, { countryCode = 'RU' } = {}) => {
    if (!query || !query.trim()) return [];
    const client = await getClient();
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

const listPickupPoints = async (cityCode) => {
    if (!cityCode) throw new Error('cityCode is required');

    const client = await getClient();
    try {
        const response = await client.get('/deliverypoints', {
            params: { city_code: Number(cityCode), type: 'PVZ' }
        });
        const points = Array.isArray(response.data) ? response.data : [];
        return points
            .filter((point) => point?.code && point?.is_handout !== false && point?.allowed_cod !== false)
            .map((point) => ({
                code: point.code,
                name: point.name || point.code,
                address: point.location?.address_full || point.location?.address || point.address_comment || point.address || '',
                full_address: point.location?.address_full || point.location?.address || point.address || '',
                work_time: point.work_time || '',
                phones: Array.isArray(point.phones) ? point.phones.map((phone) => phone?.number).filter(Boolean) : [],
                note: point.note || point.address_comment || '',
                is_dressing_room: Boolean(point.is_dressing_room),
                have_cashless: Boolean(point.have_cashless),
                have_cash: Boolean(point.have_cash),
                allowed_cod: point.allowed_cod !== false
            }));
    } catch (error) {
        logError('cdek.listPickupPoints', error, {
            cityCode,
            status: error.response?.status,
            data: error.response?.data
        });
        throw error;
    }
};

const calculateTariff = async ({ toCityCode, toAddress, products, deliveryMode = 'door' }) => {
    if (!toCityCode) throw new Error('toCityCode is required');

    const senderCityCode = Number(await getSetting('CDEK_SENDER_CITY_CODE'));
    if (!senderCityCode) throw new Error('CDEK_SENDER_CITY_CODE не настроен — заполните настройки СДЭК в админке');

    const normalizedMode = String(deliveryMode || 'door').trim().toLowerCase() === 'pvz' ? 'pvz' : 'door';
    const tariffCode = Number(
        await getSetting(normalizedMode === 'pvz' ? 'CDEK_TARIFF_CODE_PVZ' : 'CDEK_TARIFF_CODE')
        || (normalizedMode === 'pvz' ? DEFAULT_PVZ_TARIFF_CODE : DEFAULT_TARIFF_CODE)
    );

    const items = buildCdekItems(products || []);
    const packages = buildPackages({ orderNumber: 'calc', items });

    const payload = {
        type: 1,
        tariff_code: tariffCode,
        from_location: { code: senderCityCode },
        to_location: {
            code: Number(toCityCode),
            address: normalizedMode === 'door' ? (toAddress || undefined) : undefined
        },
        packages: packages.map((pkg) => ({
            weight: pkg.weight,
            length: pkg.length,
            width: pkg.width,
            height: pkg.height
        }))
    };

    const client = await getClient();
    try {
        const response = await client.post('/calculator/tariff', payload);
        const data = response.data || {};
        const sourceCurrency = String(data.currency || 'RUB').trim().toUpperCase();
        const deliverySum = Number(data.delivery_sum ?? data.total_sum ?? 0);
        const totalSum = Number(data.total_sum ?? data.delivery_sum ?? 0);

        return {
            delivery_sum: normalizeCdekMoneyToRub(deliverySum, sourceCurrency),
            total_sum: normalizeCdekMoneyToRub(totalSum, sourceCurrency),
            period_min: Number(data.period_min ?? data.calendar_min ?? 0),
            period_max: Number(data.period_max ?? data.calendar_max ?? 0),
            tariff_code: tariffCode,
            currency: 'RUB',
            delivery_mode: normalizedMode,
            source_currency: sourceCurrency,
            source_delivery_sum: deliverySum,
            source_total_sum: totalSum
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
    const client = await getClient();
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
    const client = await getClient();
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

const requestPrint = async ({ orderUuid, cdekNumber, orderNumber }, kind) => {
    const client = await getClient();
    const endpoint = kind === 'barcode' ? '/print/barcodes' : '/print/orders';
    const orderRef = {};
    if (cdekNumber) {
        orderRef.cdek_number = String(cdekNumber);
    } else if (orderNumber) {
        orderRef.number = String(orderNumber);
    } else if (orderUuid) {
        orderRef.order_uuid = String(orderUuid);
    } else {
        throw new Error('orderUuid or cdekNumber is required');
    }
    try {
        const response = await client.post(endpoint, {
            orders: [orderRef],
            copies: 1,
            format: kind === 'barcode' ? 'A6' : undefined
        });
        return response.data;
    } catch (error) {
        logError('cdek.requestPrint', error, {
            orderUuid,
            cdekNumber,
            orderNumber,
            kind,
            status: error.response?.status,
            data: error.response?.data
        });
        throw error;
    }
};

const getPrintForm = async (formUuid, kind) => {
    const client = await getClient();
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
        const statuses = Array.isArray(data?.entity?.statuses) ? data.entity.statuses.map((item) => item?.code).filter(Boolean) : [];
        const status = statuses[statuses.length - 1] || data?.entity?.status;
        const url = data?.entity?.url;
        const requests = Array.isArray(data?.requests) ? data.requests : [];
        const invalidRequest = requests.find((request) => request?.state === 'INVALID' || (Array.isArray(request?.errors) && request.errors.length > 0));
        if ((status === 'READY' || status === 'DONE') && url) {
            return { url, data };
        }
        if (invalidRequest) {
            const reason = Array.isArray(invalidRequest.errors) && invalidRequest.errors.length > 0
                ? invalidRequest.errors.map((item) => item?.message || item?.code).filter(Boolean).join('; ')
                : invalidRequest.state;
            throw new Error(`CDEK print form is invalid${reason ? `: ${reason}` : ''}`);
        }
        if (status === 'INVALID' || status === 'REMOVED') {
            throw new Error(`CDEK print form is ${status}`);
        }
        await sleep(intervalMs);
    }
    throw new Error('CDEK print form polling timed out');
};

const downloadPrintPdf = async (pdfUrl) => {
    const client = await getClient();
    try {
        const response = await client.get(pdfUrl, {
            responseType: 'arraybuffer',
            baseURL: ''
        });
        return {
            data: Buffer.from(response.data),
            headers: response.headers || {},
            status: response.status
        };
    } catch (error) {
        logError('cdek.downloadPrintPdf', error, {
            pdfUrl,
            status: error.response?.status
        });
        throw error;
    }
};

const createIntake = async (payload) => {
    const client = await getClient();
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
    const client = await getClient();
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
    listPickupPoints,
    calculateTariff,
    createOrder,
    getOrderByUuid,
    pollOrderUntilRegistered,
    requestPrint,
    getPrintForm,
    pollPrintReady,
    downloadPrintPdf,
    createIntake,
    subscribeWebhook
};
