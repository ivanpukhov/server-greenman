const Sequelize = require('sequelize');
const Order = require('../models/orders/Order');
const sendMessageToChannel = require('./sendMessageToChannel');

const { Op } = Sequelize;
const POLL_INTERVAL_MS = 10000;

const state = {
    status: 'idle',
    startedAt: null,
    finishedAt: null,
    error: '',
    totalOrders: 0,
    processedOrders: 0,
    currentOrderId: null,
    currentAttempt: 0,
    orderIds: [],
    items: [],
    events: []
};

let activeRunPromise = null;

const cloneState = () => JSON.parse(JSON.stringify(state));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeTrackingNumber = (value) => String(value || '').trim().toUpperCase();

const pushEvent = (message) => {
    state.events.push({
        at: new Date().toISOString(),
        message: String(message || '').trim()
    });

    if (state.events.length > 50) {
        state.events.splice(0, state.events.length - 50);
    }
};

const resetState = () => {
    state.status = 'idle';
    state.startedAt = null;
    state.finishedAt = null;
    state.error = '';
    state.totalOrders = 0;
    state.processedOrders = 0;
    state.currentOrderId = null;
    state.currentAttempt = 0;
    state.orderIds = [];
    state.items = [];
    state.events = [];
};

const markItemStatus = (orderId, patch) => {
    const item = state.items.find((entry) => Number(entry.orderId) === Number(orderId));
    if (!item) {
        return;
    }

    Object.assign(item, patch);
};

const findDuplicateOrderByTracking = async (trackingNumber, excludeOrderId) => {
    const normalizedTracking = normalizeTrackingNumber(trackingNumber);
    if (!normalizedTracking) {
        return null;
    }

    const candidates = await Order.findAll({
        where: {
            id: {
                [Op.ne]: excludeOrderId
            },
            trackingNumber: {
                [Op.not]: null
            }
        }
    });

    return candidates.find((order) => normalizeTrackingNumber(order.trackingNumber) === normalizedTracking) || null;
};

const waitForUniqueTrackingNumber = async (orderId) => {
    while (true) {
        await sleep(POLL_INTERVAL_MS);
        const order = await Order.findByPk(orderId);
        if (!order) {
            throw new Error(`Заказ #${orderId} не найден во время ожидания трек-номера`);
        }

        const trackingNumber = normalizeTrackingNumber(order.trackingNumber);
        if (!trackingNumber) {
            continue;
        }

        const duplicateOrder = await findDuplicateOrderByTracking(trackingNumber, orderId);
        if (duplicateOrder) {
            await order.update({ trackingNumber: null });
            pushEvent(
                `Заказ #${orderId}: трек ${trackingNumber} уже занят заказом #${duplicateOrder.id}, отправляем повторно`
            );
            return {
                ok: false,
                trackingNumber,
                duplicateOrderId: duplicateOrder.id
            };
        }

        return {
            ok: true,
            trackingNumber
        };
    }
};

const sendOrderForTracking = async (orderId) => {
    while (true) {
        const order = await Order.findByPk(orderId);
        if (!order) {
            throw new Error(`Заказ #${orderId} не найден`);
        }

        state.currentOrderId = orderId;
        state.currentAttempt += 1;
        markItemStatus(orderId, {
            status: 'sending',
            currentAttempt: state.currentAttempt,
            lastSentAt: new Date().toISOString()
        });

        pushEvent(`Заказ #${orderId}: отправка в Telegram, попытка ${state.currentAttempt}`);
        const sendResult = await sendMessageToChannel(order.toJSON());
        if (!sendResult?.ok) {
            throw new Error(`Не удалось отправить заказ #${orderId} в Telegram`);
        }

        markItemStatus(orderId, {
            status: 'waiting_tracking',
            sentVia: sendResult.via
        });

        const trackingResult = await waitForUniqueTrackingNumber(orderId);
        if (!trackingResult.ok) {
            markItemStatus(orderId, {
                status: 'duplicate_retry',
                trackingNumber: '',
                duplicateOrderId: trackingResult.duplicateOrderId
            });
            continue;
        }

        markItemStatus(orderId, {
            status: 'done',
            trackingNumber: trackingResult.trackingNumber,
            completedAt: new Date().toISOString()
        });
        state.processedOrders += 1;
        pushEvent(`Заказ #${orderId}: получен уникальный трек ${trackingResult.trackingNumber}`);
        return trackingResult.trackingNumber;
    }
};

const runQueue = async (orders) => {
    try {
        state.status = 'running';
        state.startedAt = new Date().toISOString();
        state.finishedAt = null;
        state.error = '';
        state.processedOrders = 0;
        state.currentOrderId = null;
        state.currentAttempt = 0;
        state.orderIds = orders.map((order) => order.id);
        state.totalOrders = orders.length;
        state.items = orders.map((order) => ({
            orderId: order.id,
            customerName: order.customerName || '',
            trackingNumber: '',
            previousTrackingNumber: normalizeTrackingNumber(order.trackingNumber),
            status: 'queued',
            currentAttempt: 0,
            duplicateOrderId: null,
            sentVia: '',
            lastSentAt: null,
            completedAt: null
        }));
        state.events = [];

        pushEvent(`Очередь запущена. Заказов: ${orders.length}`);

        if (orders.length === 0) {
            state.status = 'completed';
            state.finishedAt = new Date().toISOString();
            pushEvent('За сегодня не найдено оплаченных заказов Казпочты');
            return;
        }

        await Order.update(
            { trackingNumber: null },
            {
                where: {
                    id: {
                        [Op.in]: orders.map((order) => order.id)
                    }
                }
            }
        );

        pushEvent('У всех заказов из очереди очищены трек-номера');

        for (const order of orders) {
            state.currentAttempt = 0;
            await sendOrderForTracking(order.id);
        }

        state.status = 'completed';
        state.finishedAt = new Date().toISOString();
        state.currentOrderId = null;
        state.currentAttempt = 0;
        pushEvent('Очередь завершена');
    } catch (error) {
        state.status = 'failed';
        state.finishedAt = new Date().toISOString();
        state.error = error.message;
        pushEvent(`Очередь завершилась с ошибкой: ${error.message}`);
        throw error;
    } finally {
        activeRunPromise = null;
    }
};

const startTodayQueue = async (orders) => {
    if (state.status === 'running' && activeRunPromise) {
        const conflictError = new Error('Очередь уже запущена');
        conflictError.statusCode = 409;
        throw conflictError;
    }

    resetState();
    activeRunPromise = runQueue(Array.isArray(orders) ? orders : []);
    activeRunPromise.catch(() => null);

    return cloneState();
};

const getQueueStatus = () => cloneState();

module.exports = {
    startTodayQueue,
    getQueueStatus
};
