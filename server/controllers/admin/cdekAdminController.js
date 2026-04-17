const { Op } = require('sequelize');
const Order = require('../../models/orders/Order');
const Product = require('../../models/Product');
const ProductType = require('../../models/ProductType');
const cdekApi = require('../../services/cdek/cdekApi');
const { buildOrderPayload } = require('../../services/cdek/buildOrderPayload');
const { get: getSetting } = require('../../services/cdek/settingsStore');
const { logError } = require('../../utilities/errorLogger');

const parseJsonParam = (value, fallback) => {
    if (!value) return fallback;
    try {
        return JSON.parse(value);
    } catch (_) {
        return fallback;
    }
};

const parsePagination = (query) => {
    const range = parseJsonParam(query.range, null);
    if (Array.isArray(range) && range.length === 2) {
        const start = Number(range[0]);
        const end = Number(range[1]);
        return {
            offset: Number.isNaN(start) ? 0 : Math.max(0, start),
            limit: Number.isNaN(end) ? 10 : Math.max(1, end - start + 1)
        };
    }
    return { offset: 0, limit: 10 };
};

const parseSort = (query) => {
    const sort = parseJsonParam(query.sort, null);
    if (Array.isArray(sort) && sort.length === 2) {
        const [field, order] = sort;
        return [field || 'id', String(order || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC'];
    }
    return ['id', 'DESC'];
};

const buildWhere = (filter = {}) => {
    const where = { country: 'RF' };
    if (filter.status) where.status = filter.status;
    if (filter.cdekStatus) where.cdekStatus = filter.cdekStatus;
    if (filter.hasCdekUuid === true) where.cdekUuid = { [Op.ne]: null };
    if (filter.hasCdekUuid === false) where.cdekUuid = { [Op.is]: null };
    if (filter.q) {
        where[Op.or] = [
            { customerName: { [Op.like]: `%${filter.q}%` } },
            { phoneNumber: { [Op.like]: `%${filter.q}%` } },
            { cdekNumber: { [Op.like]: `%${filter.q}%` } }
        ];
    }
    return where;
};

const serializeOrder = (order) => ({
    ...order.dataValues,
    products: Array.isArray(order.products) ? order.products : []
});

const listOrdersRf = async (req, res) => {
    try {
        const { offset, limit } = parsePagination(req.query);
        const [field, order] = parseSort(req.query);
        const filter = parseJsonParam(req.query.filter, {});

        const { rows, count } = await Order.findAndCountAll({
            where: buildWhere(filter),
            order: [[field, order]],
            offset,
            limit
        });

        res.json({ data: rows.map(serializeOrder), total: count });
    } catch (error) {
        logError('cdekAdmin.listOrdersRf', error);
        res.status(500).json({ message: error.message });
    }
};

const enrichOrderWithProductInfo = async (order) => {
    const products = Array.isArray(order.products) ? order.products : [];
    if (products.length === 0) return { ...order.dataValues, products: [] };

    const typeIds = products.map((p) => Number(p.typeId)).filter(Number.isFinite);
    const types = await ProductType.findAll({
        where: { id: typeIds },
        include: [{ model: Product }]
    });
    const typeMap = new Map(types.map((t) => [t.id, t]));

    const enriched = products.map((p) => {
        const type = typeMap.get(Number(p.typeId));
        return {
            productId: p.productId,
            typeId: p.typeId,
            quantity: Math.max(1, Number(p.quantity) || 1),
            productName: type?.Product?.name || '',
            typeName: type?.type || '',
            unitPriceKzt: type?.price || 0
        };
    });

    return { ...order.dataValues, products: enriched };
};

const getOrderRf = async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order || order.country !== 'RF') {
            return res.status(404).json({ message: 'Заказ РФ не найден' });
        }
        const enriched = await enrichOrderWithProductInfo(order);
        res.json({ data: enriched });
    } catch (error) {
        logError('cdekAdmin.getOrderRf', error);
        res.status(500).json({ message: error.message });
    }
};

const updateOrderRf = async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order || order.country !== 'RF') {
            return res.status(404).json({ message: 'Заказ РФ не найден' });
        }
        const allowedFields = [
            'customerName', 'email', 'phoneNumber', 'cdekAddress', 'cdekCityCode',
            'status', 'cdekStatus', 'cdekTrackingNumber', 'totalPrice', 'cdekCalcPriceRub'
        ];
        const patch = {};
        for (const field of allowedFields) {
            if (Object.prototype.hasOwnProperty.call(req.body, field)) {
                patch[field] = req.body[field];
            }
        }
        await order.update(patch);
        const enriched = await enrichOrderWithProductInfo(order);
        res.json({ data: enriched });
    } catch (error) {
        logError('cdekAdmin.updateOrderRf', error);
        res.status(500).json({ message: error.message });
    }
};

const submitToCdek = async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order || order.country !== 'RF') {
            return res.status(404).json({ message: 'Заказ РФ не найден' });
        }
        if (order.cdekUuid) {
            return res.status(409).json({ message: 'Заказ уже отправлен в СДЭК', cdekUuid: order.cdekUuid });
        }

        const enriched = await enrichOrderWithProductInfo(order);
        const productsForCdek = (enriched.products || []).map((p) => ({
            name: p.productName,
            type: { id: p.typeId, type: p.typeName, price: p.unitPriceKzt },
            quantity: p.quantity
        }));

        const payload = await buildOrderPayload({
            id: order.id,
            customerName: order.customerName,
            email: order.email,
            phoneNumber: order.phoneNumber,
            cdekCityCode: order.cdekCityCode,
            cdekAddress: order.cdekAddress,
            products: productsForCdek
        });

        const response = await cdekApi.createOrder(payload);
        const uuid = response?.entity?.uuid;
        if (!uuid) {
            await order.update({ cdekRawResponse: JSON.stringify(response || {}) });
            return res.status(502).json({ message: 'СДЭК не вернул uuid заказа', response });
        }

        await order.update({
            cdekUuid: uuid,
            cdekStatus: 'ACCEPTED',
            cdekRawResponse: JSON.stringify(response)
        });

        try {
            const polled = await cdekApi.pollOrderUntilRegistered(uuid, { timeoutMs: 15000, intervalMs: 2000 });
            const cdekNumber = polled?.entity?.cdek_number;
            if (cdekNumber) {
                await order.update({ cdekNumber: String(cdekNumber) });
            }
        } catch (pollError) {
            logError('cdekAdmin.submitToCdek.poll', pollError, { orderId: order.id, uuid });
        }

        const refreshed = await enrichOrderWithProductInfo(order);
        res.json({ data: refreshed });
    } catch (error) {
        logError('cdekAdmin.submitToCdek', error, {
            orderId: req.params.id,
            status: error.response?.status,
            data: error.response?.data
        });
        res.status(502).json({ message: error.message, details: error.response?.data });
    }
};

const refreshFromCdek = async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order || order.country !== 'RF') {
            return res.status(404).json({ message: 'Заказ РФ не найден' });
        }
        if (!order.cdekUuid) {
            return res.status(400).json({ message: 'Заказ ещё не отправлен в СДЭК' });
        }

        const data = await cdekApi.getOrderByUuid(order.cdekUuid);
        const entity = data?.entity || {};
        const patch = {};
        if (entity.cdek_number) patch.cdekNumber = String(entity.cdek_number);

        const latestStatus = Array.isArray(entity.statuses) && entity.statuses.length > 0
            ? entity.statuses[0].code
            : null;
        if (latestStatus) {
            patch.cdekStatus = latestStatus;
            if (latestStatus === 'DELIVERED') patch.status = 'Доставлено';
            else if (latestStatus === 'NOT_DELIVERED' || latestStatus === 'RETURNED_TO_SENDER') patch.status = 'Отменено';
        }

        if (Object.keys(patch).length > 0) {
            await order.update(patch);
        }

        const refreshed = await enrichOrderWithProductInfo(order);
        res.json({ data: refreshed });
    } catch (error) {
        logError('cdekAdmin.refreshFromCdek', error, {
            orderId: req.params.id,
            status: error.response?.status
        });
        res.status(502).json({ message: error.message });
    }
};

const printPdf = async (req, res, kind) => {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order || order.country !== 'RF') {
            return res.status(404).json({ message: 'Заказ РФ не найден' });
        }
        if (!order.cdekUuid) {
            return res.status(400).json({ message: 'Заказ ещё не отправлен в СДЭК' });
        }

        const requested = await cdekApi.requestPrint(order.cdekUuid, kind);
        const formUuid = requested?.entity?.uuid;
        if (!formUuid) {
            return res.status(502).json({ message: 'СДЭК не вернул uuid печатной формы' });
        }

        const { url } = await cdekApi.pollPrintReady(formUuid, kind, { timeoutMs: 60000, intervalMs: 2500 });
        const stream = await cdekApi.downloadPrintPdfStream(url);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `inline; filename="cdek-${kind}-${order.id}.pdf"`
        );
        stream.data.pipe(res);
    } catch (error) {
        logError(`cdekAdmin.print.${kind}`, error, {
            orderId: req.params.id,
            status: error.response?.status
        });
        res.status(502).json({ message: error.message });
    }
};

const printBarcode = (req, res) => printPdf(req, res, 'barcode');
const printWaybill = (req, res) => printPdf(req, res, 'waybill');

const createIntake = async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order || order.country !== 'RF') {
            return res.status(404).json({ message: 'Заказ РФ не найден' });
        }
        if (!order.cdekNumber) {
            return res.status(400).json({ message: 'У заказа ещё нет cdek_number (подождите регистрацию в СДЭК)' });
        }

        const { intake_date, start_time, end_time, comment } = req.body || {};
        if (!intake_date || !start_time || !end_time) {
            return res.status(400).json({ message: 'Требуются intake_date, start_time, end_time' });
        }

        const senderCityCode = Number(await getSetting('CDEK_SENDER_CITY_CODE'));
        const senderAddress = await getSetting('CDEK_SENDER_ADDRESS');
        const senderName = await getSetting('CDEK_SENDER_NAME') || 'Green Man';
        const senderPhone = await getSetting('CDEK_SENDER_PHONE');

        const payload = {
            cdek_number: order.cdekNumber,
            intake_date,
            start_time,
            end_time,
            comment: comment || undefined,
            sender: {
                name: senderName,
                phones: [{ number: senderPhone }]
            },
            from_location: {
                code: senderCityCode,
                address: senderAddress
            }
        };

        const response = await cdekApi.createIntake(payload);
        const intakeUuid = response?.entity?.uuid;
        if (intakeUuid) {
            await order.update({ cdekIntakeUuid: intakeUuid });
        }
        res.json({ data: { intakeUuid, response } });
    } catch (error) {
        logError('cdekAdmin.createIntake', error, {
            orderId: req.params.id,
            status: error.response?.status,
            data: error.response?.data
        });
        res.status(502).json({ message: error.message, details: error.response?.data });
    }
};

module.exports = {
    listOrdersRf,
    getOrderRf,
    updateOrderRf,
    submitToCdek,
    refreshFromCdek,
    printBarcode,
    printWaybill,
    createIntake
};
