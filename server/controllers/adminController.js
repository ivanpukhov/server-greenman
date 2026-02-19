const Sequelize = require('sequelize');
const Product = require('../models/Product');
const ProductType = require('../models/ProductType');
const Order = require('../models/orders/Order');
const Expense = require('../models/orders/Expense');
const AdminUser = require('../models/orders/AdminUser');
const SentPaymentLink = require('../models/orders/SentPaymentLink');
const OrderBundle = require('../models/orders/OrderBundle');
const { buildProductTypeCode, buildQrCodeUrl } = require('../utilities/productTypeCode');
const PaymentLink = require('../models/orders/PaymentLink');
const sendFileNotification = require('../utilities/sendFileNotification');
const sendMessageToChannel = require('../utilities/sendMessageToChannel');
const sendNotification = require('../utilities/notificationService');
const { logError } = require('../utilities/errorLogger');
const { getActiveAdmins, getAdminByPhone, normalizeAdminPhone, normalizeAdminIin } = require('../utilities/adminUsers');
const {
    attachRecentPaymentLinkToOrder,
    markPaymentLinkConnectionAsUsed,
    canAutoMarkOrderAsPaidByConnection,
    normalizePaymentLink,
    normalizePhoneNumber
} = require('../utilities/paymentLinkUtils');
const {
    canCurrentAdminSeeTargetAdmin,
    getVisibleDispatchPlan,
    saveVisibleDispatchPlan
} = require('../utilities/paymentLinkDispatchPlan');

const { Op } = Sequelize;
const PAID_ORDER_STATUSES = ['Оплачено', 'Отправлено', 'Доставлено'];
const WITHOUT_LINK_ACCOUNT_NAME = 'Без ссылки';
const EXCLUDED_ACCOUNT_NAME_TOKENS = new Set(['иван', 'даша']);
const ORDER_BUNDLE_CODE_REGEX = /^ob_[A-Za-z0-9]{6,24}$/;

const filterRestrictedAdmins = (items, currentAdminPhone, getItemPhone) => {
    return items.filter((item) => canCurrentAdminSeeTargetAdmin(currentAdminPhone, getItemPhone(item)));
};

const parseJsonParam = (value, fallback) => {
    if (!value) return fallback;

    try {
        return JSON.parse(value);
    } catch (_e) {
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

    const page = Math.max(1, Number(query.page) || 1);
    const perPage = Math.max(1, Number(query.perPage) || 10);
    return {
        offset: (page - 1) * perPage,
        limit: perPage
    };
};

const parseSort = (query, defaultField = 'id', defaultOrder = 'DESC') => {
    const sort = parseJsonParam(query.sort, null);

    if (Array.isArray(sort) && sort.length === 2) {
        const [field, order] = sort;
        return [field || defaultField, String(order || defaultOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC'];
    }

    const sortField = query.sortField || defaultField;
    const sortOrder = String(query.sortOrder || defaultOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    return [sortField, sortOrder];
};

const parseDiseases = (diseasesRaw) => {
    if (Array.isArray(diseasesRaw)) {
        return diseasesRaw.filter(Boolean);
    }

    if (typeof diseasesRaw === 'string') {
        const parsed = parseJsonParam(diseasesRaw, null);
        if (Array.isArray(parsed)) {
            return parsed.filter(Boolean);
        }

        return diseasesRaw
            .split(/\n|,|;/)
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return [];
};

const parseStockQuantity = (rawValue) => {
    if (rawValue === undefined || rawValue === null || rawValue === '') {
        return null;
    }

    const numeric = Number(rawValue);

    if (Number.isNaN(numeric) || numeric < 0) {
        return null;
    }

    return Math.floor(numeric);
};

const parseOrderBundlePayload = (rawPayload) => {
    if (!rawPayload) {
        return null;
    }

    try {
        const payload = JSON.parse(rawPayload);
        const deliveryPrice = Number(payload?.deliveryPrice);
        const items = Array.isArray(payload?.items) ? payload.items : [];

        if (Number(payload?.v) !== 1 || !Number.isFinite(deliveryPrice) || deliveryPrice < 0 || items.length === 0) {
            return null;
        }

        const normalizedItems = items
            .map((item) => ({
                productId: Number(item?.productId),
                typeId: Number(item?.typeId),
                quantity: Math.max(1, Math.floor(Number(item?.quantity) || 1))
            }))
            .filter((item) => Number.isFinite(item.productId) && Number.isFinite(item.typeId) && item.quantity > 0);

        if (normalizedItems.length === 0) {
            return null;
        }

        return {
            v: 1,
            deliveryPrice,
            noteText: String(payload?.noteText || '').trim(),
            items: normalizedItems
        };
    } catch (_error) {
        return null;
    }
};

const parseTypes = (typesRaw) => {
    const types = typeof typesRaw === 'string' ? parseJsonParam(typesRaw, []) : (typesRaw || []);

    if (!Array.isArray(types)) {
        return [];
    }

    return types
        .filter((item) => item && item.type)
        .map((item) => ({
            id: Number(item.id) || null,
            type: String(item.type).trim(),
            price: Number(item.price) || 0,
            stockQuantity: parseStockQuantity(item.stockQuantity),
            alias:
                item.alias === undefined || item.alias === null || String(item.alias).trim() === ''
                    ? null
                    : String(item.alias).trim()
        }));
};

const serializeType = (typeRecord) => {
    const plainType = typeRecord.toJSON ? typeRecord.toJSON() : typeRecord;
    const code = buildProductTypeCode(plainType.productId, plainType.id) || plainType.code || '';

    return {
        ...plainType,
        code,
        qrCodeUrl: buildQrCodeUrl(code),
        stockStatus: plainType.stockQuantity === null ? 'Бесконечность' : `${plainType.stockQuantity} шт.`
    };
};

const serializeProduct = (productRecord) => {
    const plainProduct = productRecord.toJSON ? productRecord.toJSON() : productRecord;

    return {
        ...plainProduct,
        types: Array.isArray(plainProduct.types)
            ? plainProduct.types.map((typeItem) => serializeType(typeItem))
            : []
    };
};

const createProductTypes = async ({ productId, types, transaction }) => {
    for (const typeItem of types) {
        const createdType = await ProductType.create(
            {
                type: typeItem.type,
                price: typeItem.price,
                stockQuantity: typeItem.stockQuantity,
                alias: typeItem.alias || null,
                code: null,
                productId
            },
            { transaction }
        );

        const code = buildProductTypeCode(productId, createdType.id);
        await createdType.update({ code }, { transaction });
    }
};

const getFlattenedInventory = async () => {
    const products = await Product.findAll({
        include: [{ model: ProductType, as: 'types' }],
        order: [['name', 'ASC']]
    });

    const rows = [];

    products.forEach((product) => {
        const productJson = product.toJSON();
        productJson.types.forEach((typeItem) => {
            const code = buildProductTypeCode(productJson.id, typeItem.id) || typeItem.code || '';
            rows.push({
                id: typeItem.id,
                productId: productJson.id,
                productName: productJson.name,
                typeName: typeItem.type,
                alias: typeItem.alias || null,
                typePrice: typeItem.price,
                stockQuantity: typeItem.stockQuantity,
                stockStatus: typeItem.stockQuantity === null ? 'Бесконечность' : `${typeItem.stockQuantity} шт.`,
                code,
                qrCodeUrl: buildQrCodeUrl(code)
            });
        });
    });

    return rows;
};

const enrichOrderProducts = async (order) => {
    const rawProducts = Array.isArray(order.products) ? order.products : [];

    const enrichedProducts = await Promise.all(
        rawProducts.map(async (item) => {
            const productId = item.productId || null;
            const typeId = item.typeId || null;

            let productName = null;
            let typeName = null;
            let stockQuantity = null;

            if (productId) {
                const product = await Product.findByPk(productId, { attributes: ['id', 'name'] });
                productName = product ? product.name : null;
            }

            if (typeId) {
                const productType = await ProductType.findByPk(typeId, { attributes: ['id', 'type', 'price', 'stockQuantity'] });
                typeName = productType ? productType.type : null;
                stockQuantity = productType ? productType.stockQuantity : null;
            }

            return {
                ...item,
                productName,
                typeName,
                stockQuantity
            };
        })
    );

    return {
        ...order.toJSON(),
        products: enrichedProducts
    };
};

const buildProductPayload = (body) => {
    const types = parseTypes(body.types);
    const diseases = parseDiseases(body.diseases);

    return {
        name: String(body.name || '').trim(),
        description: body.description || '',
        applicationMethodChildren: body.applicationMethodChildren || '',
        applicationMethodAdults: body.applicationMethodAdults || '',
        diseases,
        contraindications: body.contraindications || '',
        videoUrl: body.videoUrl || null,
        types
    };
};

const getOrderPeriodRange = (periodRaw) => {
    const period = String(periodRaw || '').trim().toLowerCase();
    const now = new Date();

    const start = new Date(now);
    const end = new Date(now);

    if (period === 'today') {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    }

    if (period === 'yesterday') {
        start.setDate(start.getDate() - 1);
        end.setDate(end.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    }

    if (period === 'week') {
        start.setDate(start.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    }

    if (period === 'month') {
        start.setMonth(start.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    }

    if (period === 'halfyear') {
        start.setMonth(start.getMonth() - 6);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    }

    return null;
};

const safeAmount = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
};

const toVirtualPaidOrderFromConnection = (connection) => {
    const paidAmount = safeAmount(connection.paidAmount || connection.expectedAmount);
    const receivedAt = connection.receivedAt || connection.paidAt || new Date().toISOString();

    return {
        id: `conn-${connection.id}`,
        customerName: 'Ожидает оформления',
        city: '—',
        status: 'Оплачено',
        totalPrice: paidAmount,
        createdAt: receivedAt,
        paymentMethod: 'link',
        paymentLink: connection.paymentLink || '',
        paymentSellerName: String(connection.sellerAdminName || '').trim() || null
    };
};

const resolveOrderAccountName = (order, linkToAccountMap, defaultAccountName) => {
    const paymentSellerName = String(order.paymentSellerName || '').trim();
    if (paymentSellerName) {
        return paymentSellerName;
    }

    const paymentMethod = String(order.paymentMethod || '').trim().toLowerCase();
    const paymentLink = normalizePaymentLink(order.paymentLink);

    if (paymentLink) {
        return linkToAccountMap.get(paymentLink) || WITHOUT_LINK_ACCOUNT_NAME;
    }

    if (paymentMethod === 'kaspi' || paymentMethod === 'money') {
        return defaultAccountName;
    }

    if (paymentMethod === 'link') {
        return WITHOUT_LINK_ACCOUNT_NAME;
    }

    return WITHOUT_LINK_ACCOUNT_NAME;
};

const buildAccountingContext = async () => {
    const activeAdmins = await getActiveAdmins();
    const nataliaAdmin = activeAdmins.find((item) => String(item.fullName || '').trim().toLowerCase() === 'наталья');
    const defaultAccountName = nataliaAdmin ? nataliaAdmin.fullName : 'Наталья';
    const paymentLinks = await PaymentLink.findAll({
        attributes: ['url', 'adminName']
    });
    const linkToAccountMap = new Map(
        paymentLinks.map((item) => [normalizePaymentLink(item.url), String(item.adminName || '').trim()])
    );

    return {
        activeAdmins,
        defaultAccountName,
        linkToAccountMap
    };
};

const resolveOrderAccountNameByContext = (order, context) => {
    if (!context) {
        return WITHOUT_LINK_ACCOUNT_NAME;
    }

    return resolveOrderAccountName(order, context.linkToAccountMap, context.defaultAccountName);
};

const isExcludedAccountingAccountName = (accountName) => {
    const tokens = String(accountName || '')
        .trim()
        .toLowerCase()
        .split(/[^a-zа-яё0-9]+/i)
        .filter(Boolean);

    return tokens.some((token) => EXCLUDED_ACCOUNT_NAME_TOKENS.has(token));
};

const excludeOrdersByAccountingAccounts = (orders, context) => {
    return (Array.isArray(orders) ? orders : []).filter((order) => {
        const accountName = resolveOrderAccountNameByContext(order, context);
        return !isExcludedAccountingAccountName(accountName);
    });
};

const buildAccountingAllocation = async (orders, currentAdminPhone, preloadedContext = null) => {
    const context = preloadedContext || (await buildAccountingContext());
    const { activeAdmins } = context;
    const normalizedCurrentAdminPhone = normalizeAdminPhone(currentAdminPhone);
    const hiddenAccountNames = new Set(
        normalizedCurrentAdminPhone
            ? activeAdmins
                  .filter((item) => !canCurrentAdminSeeTargetAdmin(normalizedCurrentAdminPhone, item.phoneNumber))
                  .map((item) => String(item.fullName || '').trim())
                  .filter(Boolean)
            : []
    );

    const byAccountMap = new Map();
    let withoutLinkTotal = 0;
    let withoutLinkOrdersCount = 0;
    const accountNameByOrderId = {};

    orders.forEach((order) => {
        const resolvedAccountName = resolveOrderAccountNameByContext(order, context);
        const accountName = hiddenAccountNames.has(resolvedAccountName) ? WITHOUT_LINK_ACCOUNT_NAME : resolvedAccountName;
        accountNameByOrderId[order.id] = accountName;
        const orderAmount = safeAmount(order.totalPrice);

        if (accountName === WITHOUT_LINK_ACCOUNT_NAME) {
            withoutLinkTotal += orderAmount;
            withoutLinkOrdersCount += 1;
            return;
        }

        const current = byAccountMap.get(accountName) || { accountName, total: 0, ordersCount: 0 };
        current.total += orderAmount;
        current.ordersCount += 1;
        byAccountMap.set(accountName, current);
    });

    return {
        byAccount: [...byAccountMap.values()].sort((a, b) => b.total - a.total),
        withoutLink: {
            accountName: WITHOUT_LINK_ACCOUNT_NAME,
            total: withoutLinkTotal,
            ordersCount: withoutLinkOrdersCount
        },
        accountNameByOrderId
    };
};

const getPaidConnectionsWithoutOrder = async (range, phoneQuery = '') => {
    const where = {
        isPaid: true,
        linkedOrderId: null
    };

    if (range) {
        where[Op.or] = [
            {
                paidAt: {
                    [Op.gte]: range.start,
                    [Op.lte]: range.end
                }
            },
            {
                receivedAt: {
                    [Op.gte]: range.start,
                    [Op.lte]: range.end
                }
            }
        ];
    }

    const normalizedPhoneQuery = String(phoneQuery || '').replace(/\D/g, '');
    if (normalizedPhoneQuery) {
        where.customerPhone = {
            [Op.like]: `%${normalizedPhoneQuery}%`
        };
    }

    const rows = await SentPaymentLink.findAll({
        where,
        order: [['receivedAt', 'DESC']]
    });

    return rows.map((item) => item.toJSON()).map(toVirtualPaidOrderFromConnection);
};

const toPositiveInt = (value) => {
    const numeric = Math.floor(Number(value));
    if (!Number.isFinite(numeric) || numeric <= 0) {
        return null;
    }

    return numeric;
};

const normalizeOrderProducts = (productsRaw) => {
    const products = Array.isArray(productsRaw) ? productsRaw : parseJsonParam(productsRaw, []);

    if (!Array.isArray(products)) {
        return [];
    }

    return products
        .map((item) => {
            const productId = Number(item?.productId);
            const typeId = Number(item?.typeId);
            const quantity = toPositiveInt(item?.quantity);

            if (!Number.isFinite(productId) || !Number.isFinite(typeId) || !quantity) {
                return null;
            }

            return {
                productId,
                typeId,
                quantity
            };
        })
        .filter(Boolean);
};

const extractTypeVolume = (typeName) => {
    const volumeMatch = String(typeName || '').match(/\b\d+\b/);
    let volume = 1000;

    if (volumeMatch && volumeMatch[0]) {
        volume = Number(volumeMatch[0]);
        if (!Number.isFinite(volume) || volume < 300) {
            volume = 1000;
        }
    }

    return volume;
};

const calculateDeliveryCostForAdminOrder = (deliveryMethod, productsWithTypes) => {
    if (deliveryMethod === 'kazpost') {
        const totalVolume = productsWithTypes.reduce((sum, item) => {
            return sum + extractTypeVolume(item.typeName) * item.quantity;
        }, 0);

        const basePrice = 1800;
        if (totalVolume <= 1000) {
            return basePrice;
        }

        const extraVolume = totalVolume - 1000;
        const extraCost = Math.ceil(extraVolume / 1000) * 400;
        return basePrice + extraCost;
    }

    if (deliveryMethod === 'indrive') {
        return 4000;
    }

    if (deliveryMethod === 'city') {
        return 1500;
    }

    return 3000;
};

const isPaidOrderStatus = (status) => {
    const normalized = String(status || '').trim().toLowerCase();
    return normalized === 'оплачено' || normalized === 'отправлено' || normalized === 'доставлено';
};

const buildOrdersAnalytics = (orders, productNameById = new Map()) => {
    const cityStats = new Map();
    const productStats = new Map();
    let revenue = 0;

    orders.forEach((order) => {
        if (isPaidOrderStatus(order.status)) {
            revenue += safeAmount(order.totalPrice);
        }

        const cityName = String(order.city || '').trim() || 'Не указан';
        cityStats.set(cityName, (cityStats.get(cityName) || 0) + 1);

        const orderProducts = Array.isArray(order.products) ? order.products : [];
        orderProducts.forEach((product) => {
            const productName =
                String(product.productName || product.name || '').trim() ||
                productNameById.get(Number(product.productId)) ||
                'Без названия';
            const quantity = Math.max(1, Math.floor(Number(product.quantity) || 1));
            productStats.set(productName, (productStats.get(productName) || 0) + quantity);
        });
    });

    const topCityEntry = [...cityStats.entries()].sort((a, b) => b[1] - a[1])[0] || null;
    const topProductEntry = [...productStats.entries()].sort((a, b) => b[1] - a[1])[0] || null;

    return {
        revenue,
        ordersCount: orders.length,
        topCity: topCityEntry
            ? {
                  name: topCityEntry[0],
                  count: topCityEntry[1]
              }
            : null,
        topProduct: topProductEntry
            ? {
                  name: topProductEntry[0],
                  count: topProductEntry[1]
              }
            : null
    };
};

const MONTH_LABELS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

const getDashboardRanges = (periodRaw) => {
    const now = new Date();
    const selectedPeriod = ['today', 'week', 'month', 'year'].includes(String(periodRaw || '').toLowerCase())
        ? String(periodRaw || '').toLowerCase()
        : 'month';

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - 6);

    const monthStart = new Date(now);
    monthStart.setHours(0, 0, 0, 0);
    monthStart.setDate(monthStart.getDate() - 29);

    const yearStart = new Date(now);
    yearStart.setHours(0, 0, 0, 0);
    yearStart.setMonth(yearStart.getMonth() - 11);
    yearStart.setDate(1);

    const maxStart = new Date(Math.min(weekStart.getTime(), monthStart.getTime(), yearStart.getTime()));

    return {
        selectedPeriod,
        today: { start: todayStart, end: now },
        week: { start: weekStart, end: now },
        month: { start: monthStart, end: now },
        year: { start: yearStart, end: now },
        maxStart,
        now
    };
};

const formatDayKey = (date) => date.toISOString().slice(0, 10);
const formatMonthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const buildDailyAxis = (range) => {
    const result = [];
    const current = new Date(range.start);

    while (current <= range.end) {
        result.push({
            key: formatDayKey(current),
            label: `${String(current.getDate()).padStart(2, '0')}.${String(current.getMonth() + 1).padStart(2, '0')}`
        });
        current.setDate(current.getDate() + 1);
    }

    return result;
};

const buildMonthlyAxis = (range) => {
    const result = [];
    const current = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
    const end = new Date(range.end.getFullYear(), range.end.getMonth(), 1);

    while (current <= end) {
        result.push({
            key: formatMonthKey(current),
            label: MONTH_LABELS[current.getMonth()]
        });
        current.setMonth(current.getMonth() + 1);
    }

    return result;
};

const withinRange = (date, range) => date >= range.start && date <= range.end;

const buildDashboardSeries = (orders, expenses, ranges) => {
    const todayAxis = buildDailyAxis(ranges.today);
    const weekAxis = buildDailyAxis(ranges.week);
    const monthAxis = buildDailyAxis(ranges.month);
    const yearAxis = buildMonthlyAxis(ranges.year);

    const initOrderMap = (axis) => new Map(axis.map((item) => [item.key, 0]));
    const initFinanceMap = (axis) =>
        new Map(
            axis.map((item) => [
                item.key,
                {
                    turnover: 0,
                    expenses: 0
                }
            ])
        );

    const orderCountMaps = {
        today: initOrderMap(todayAxis),
        week: initOrderMap(weekAxis),
        month: initOrderMap(monthAxis),
        year: initOrderMap(yearAxis)
    };
    const financeMaps = {
        today: initFinanceMap(todayAxis),
        week: initFinanceMap(weekAxis),
        month: initFinanceMap(monthAxis),
        year: initFinanceMap(yearAxis)
    };

    const upsertFinanceValue = (map, key, field, amount) => {
        const current = map.get(key);
        if (!current) {
            return;
        }
        current[field] += amount;
        map.set(key, current);
    };

    orders.forEach((order) => {
        const createdAt = new Date(order.createdAt);
        if (Number.isNaN(createdAt.getTime())) {
            return;
        }

        const amount = safeAmount(order.totalPrice);
        const dayKey = formatDayKey(createdAt);
        const monthKey = formatMonthKey(createdAt);

        if (withinRange(createdAt, ranges.today)) {
            orderCountMaps.today.set(dayKey, (orderCountMaps.today.get(dayKey) || 0) + 1);
            upsertFinanceValue(financeMaps.today, dayKey, 'turnover', amount);
        }

        if (withinRange(createdAt, ranges.week)) {
            orderCountMaps.week.set(dayKey, (orderCountMaps.week.get(dayKey) || 0) + 1);
            upsertFinanceValue(financeMaps.week, dayKey, 'turnover', amount);
        }

        if (withinRange(createdAt, ranges.month)) {
            orderCountMaps.month.set(dayKey, (orderCountMaps.month.get(dayKey) || 0) + 1);
            upsertFinanceValue(financeMaps.month, dayKey, 'turnover', amount);
        }

        if (withinRange(createdAt, ranges.year)) {
            orderCountMaps.year.set(monthKey, (orderCountMaps.year.get(monthKey) || 0) + 1);
            upsertFinanceValue(financeMaps.year, monthKey, 'turnover', amount);
        }
    });

    expenses.forEach((expense) => {
        const spentAt = new Date(expense.spentAt);
        if (Number.isNaN(spentAt.getTime())) {
            return;
        }

        const amount = safeAmount(expense.amount);
        const dayKey = formatDayKey(spentAt);
        const monthKey = formatMonthKey(spentAt);

        if (withinRange(spentAt, ranges.today)) {
            upsertFinanceValue(financeMaps.today, dayKey, 'expenses', amount);
        }

        if (withinRange(spentAt, ranges.week)) {
            upsertFinanceValue(financeMaps.week, dayKey, 'expenses', amount);
        }

        if (withinRange(spentAt, ranges.month)) {
            upsertFinanceValue(financeMaps.month, dayKey, 'expenses', amount);
        }

        if (withinRange(spentAt, ranges.year)) {
            upsertFinanceValue(financeMaps.year, monthKey, 'expenses', amount);
        }
    });

    const buildOrderSeries = (axis, map) =>
        axis.map((point) => ({
            label: point.label,
            orders: map.get(point.key) || 0
        }));

    const buildFinanceSeries = (axis, map) =>
        axis.map((point) => {
            const value = map.get(point.key) || { turnover: 0, expenses: 0 };
            return {
                label: point.label,
                turnover: value.turnover,
                expenses: value.expenses,
                profit: value.turnover - value.expenses
            };
        });

    return {
        orderSeries: {
            today: buildOrderSeries(todayAxis, orderCountMaps.today),
            week: buildOrderSeries(weekAxis, orderCountMaps.week),
            month: buildOrderSeries(monthAxis, orderCountMaps.month),
            year: buildOrderSeries(yearAxis, orderCountMaps.year)
        },
        financeSeries: {
            today: buildFinanceSeries(todayAxis, financeMaps.today),
            week: buildFinanceSeries(weekAxis, financeMaps.week),
            month: buildFinanceSeries(monthAxis, financeMaps.month),
            year: buildFinanceSeries(yearAxis, financeMaps.year)
        }
    };
};

const buildTopProducts = (orders, productNameById = new Map(), limit = null) => {
    const productStats = new Map();

    orders.forEach((order) => {
        const orderProducts = Array.isArray(order.products) ? order.products : [];
        orderProducts.forEach((product) => {
            const productName =
                String(product.productName || product.name || '').trim() ||
                productNameById.get(Number(product.productId)) ||
                'Без названия';
            const quantity = Math.max(1, Math.floor(Number(product.quantity) || 1));
            productStats.set(productName, (productStats.get(productName) || 0) + quantity);
        });
    });

    const sorted = [...productStats.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }));

    if (Number.isFinite(limit) && limit > 0) {
        return sorted.slice(0, limit);
    }

    return sorted;
};

const adminController = {
    async getProducts(req, res) {
        try {
            const { offset, limit } = parsePagination(req.query);
            const [sortField, sortOrder] = parseSort(req.query, 'id', 'DESC');
            const filter = parseJsonParam(req.query.filter, {});

            const where = {};
            if (filter.q) {
                where.name = {
                    [Op.like]: `%${String(filter.q).trim()}%`
                };
            }

            const { rows, count } = await Product.findAndCountAll({
                where,
                include: [{ model: ProductType, as: 'types' }],
                order: [[sortField, sortOrder]],
                offset,
                limit
            });

            return res.json({ data: rows.map(serializeProduct), total: count });
        } catch (error) {
            return res.status(500).json({ message: 'Не удалось получить список товаров', error: error.message });
        }
    },

    async getProduct(req, res) {
        try {
            const product = await Product.findByPk(req.params.id, {
                include: [{ model: ProductType, as: 'types' }]
            });

            if (!product) {
                return res.status(404).json({ message: 'Товар не найден' });
            }

            return res.json({ data: serializeProduct(product) });
        } catch (error) {
            return res.status(500).json({ message: 'Не удалось получить товар', error: error.message });
        }
    },

    async createProduct(req, res) {
        const transaction = await Product.sequelize.transaction();

        try {
            const payload = buildProductPayload(req.body);

            if (!payload.name || payload.diseases.length === 0 || !payload.contraindications) {
                await transaction.rollback();
                return res.status(400).json({ message: 'Заполните обязательные поля товара' });
            }

            const product = await Product.create(
                {
                    name: payload.name,
                    description: payload.description,
                    applicationMethodChildren: payload.applicationMethodChildren,
                    applicationMethodAdults: payload.applicationMethodAdults,
                    diseases: payload.diseases,
                    contraindications: payload.contraindications,
                    videoUrl: payload.videoUrl
                },
                { transaction }
            );

            if (payload.types.length > 0) {
                await createProductTypes({
                    productId: product.id,
                    types: payload.types,
                    transaction
                });
            }

            await transaction.commit();

            const created = await Product.findByPk(product.id, {
                include: [{ model: ProductType, as: 'types' }]
            });

            return res.status(201).json({ data: serializeProduct(created) });
        } catch (error) {
            await transaction.rollback();
            return res.status(500).json({ message: 'Не удалось создать товар', error: error.message });
        }
    },

    async updateProduct(req, res) {
        const transaction = await Product.sequelize.transaction();

        try {
            const product = await Product.findByPk(req.params.id);

            if (!product) {
                await transaction.rollback();
                return res.status(404).json({ message: 'Товар не найден' });
            }

            const payload = buildProductPayload(req.body);

            if (!payload.name || payload.diseases.length === 0 || !payload.contraindications) {
                await transaction.rollback();
                return res.status(400).json({ message: 'Заполните обязательные поля товара' });
            }

            await product.update(
                {
                    name: payload.name,
                    description: payload.description,
                    applicationMethodChildren: payload.applicationMethodChildren,
                    applicationMethodAdults: payload.applicationMethodAdults,
                    diseases: payload.diseases,
                    contraindications: payload.contraindications,
                    videoUrl: payload.videoUrl
                },
                { transaction }
            );

            const existingTypes = await ProductType.findAll({
                where: { productId: product.id },
                transaction
            });
            const existingTypesById = new Map(existingTypes.map((typeItem) => [typeItem.id, typeItem]));
            const retainedTypeIds = new Set();

            for (const typeItem of payload.types) {
                const existingType = typeItem.id ? existingTypesById.get(typeItem.id) : null;

                if (existingType) {
                    await existingType.update(
                        {
                            type: typeItem.type,
                            price: typeItem.price,
                            stockQuantity: typeItem.stockQuantity,
                            alias:
                                typeItem.alias === undefined
                                    ? existingType.alias
                                    : typeItem.alias
                        },
                        { transaction }
                    );
                    retainedTypeIds.add(existingType.id);
                    continue;
                }

                const createdType = await ProductType.create(
                    {
                        type: typeItem.type,
                        price: typeItem.price,
                        stockQuantity: typeItem.stockQuantity,
                        alias: typeItem.alias || null,
                        code: null,
                        productId: product.id
                    },
                    { transaction }
                );

                const code = buildProductTypeCode(product.id, createdType.id);
                await createdType.update({ code }, { transaction });
                retainedTypeIds.add(createdType.id);
            }

            const staleTypeIds = existingTypes
                .map((typeItem) => typeItem.id)
                .filter((typeId) => !retainedTypeIds.has(typeId));

            if (staleTypeIds.length > 0) {
                await ProductType.destroy({
                    where: { id: staleTypeIds, productId: product.id },
                    transaction
                });
            }

            await transaction.commit();

            const updated = await Product.findByPk(product.id, {
                include: [{ model: ProductType, as: 'types' }]
            });

            return res.json({ data: serializeProduct(updated) });
        } catch (error) {
            await transaction.rollback();
            return res.status(500).json({ message: 'Не удалось обновить товар', error: error.message });
        }
    },

    async deleteProduct(req, res) {
        const transaction = await Product.sequelize.transaction();

        try {
            const product = await Product.findByPk(req.params.id, {
                include: [{ model: ProductType, as: 'types' }]
            });

            if (!product) {
                await transaction.rollback();
                return res.status(404).json({ message: 'Товар не найден' });
            }

            await ProductType.destroy({ where: { productId: product.id }, transaction });
            await product.destroy({ transaction });

            await transaction.commit();

            return res.json({ data: serializeProduct(product) });
        } catch (error) {
            await transaction.rollback();
            return res.status(500).json({ message: 'Не удалось удалить товар', error: error.message });
        }
    },

    async sendOrderPhoto(req, res) {
        try {
            const orderId = Number(req.params.id);

            if (!Number.isFinite(orderId)) {
                return res.status(400).json({ message: 'Некорректный ID заказа' });
            }

            if (!req.file || !req.file.buffer) {
                return res.status(400).json({ message: 'Выберите файл для отправки' });
            }

            const order = await Order.findByPk(orderId, {
                attributes: ['id', 'phoneNumber', 'customerName']
            });

            if (!order) {
                return res.status(404).json({ message: 'Заказ не найден' });
            }

            if (!order.phoneNumber) {
                return res.status(400).json({ message: 'У заказа отсутствует номер телефона получателя' });
            }

            const caption = String(req.body?.caption || '').trim();
            const providerResponse = await sendFileNotification({
                phoneNumber: order.phoneNumber,
                fileBuffer: req.file.buffer,
                fileName: req.file.originalname,
                mimeType: req.file.mimetype,
                caption
            });

            return res.json({
                data: {
                    orderId: order.id,
                    customerName: order.customerName,
                    phoneNumber: order.phoneNumber,
                    fileName: req.file.originalname,
                    providerResponse
                }
            });
        } catch (error) {
            logError('adminController.sendOrderPhoto', error, {
                orderId: req.params.id,
                fileName: req.file?.originalname || null,
                mimeType: req.file?.mimetype || null,
                providerStatus: error?.status || null,
                providerResponseBody: error?.responseBody || null
            });
            return res.status(500).json({ message: 'Не удалось отправить файл клиенту', error: error.message });
        }
    },

    async getOrders(req, res) {
        try {
            const { offset, limit } = parsePagination(req.query);
            const [sortField, sortOrder] = parseSort(req.query, 'id', 'DESC');
            const filter = parseJsonParam(req.query.filter, {});
            const paidOnly = filter.paidOnly === true || String(filter.paidOnly || '').toLowerCase() === 'true';
            const excludeIvanDasha = filter.excludeIvanDasha === true || String(filter.excludeIvanDasha || '').toLowerCase() === 'true';
            const periodRange = filter.period ? getOrderPeriodRange(filter.period) : null;

            const where = {};

            if (filter.status) {
                where.status = filter.status;
            }

            if (paidOnly) {
                if (filter.status) {
                    where.status = isPaidOrderStatus(filter.status) ? filter.status : { [Op.in]: [] };
                } else {
                    where.status = { [Op.in]: PAID_ORDER_STATUSES };
                }
            }

            if (filter.phoneNumber) {
                where.phoneNumber = {
                    [Op.like]: `%${String(filter.phoneNumber).replace(/\D/g, '')}%`
                };
            }

            if (periodRange) {
                if (periodRange) {
                    where.createdAt = {
                        [Op.gte]: periodRange.start,
                        [Op.lte]: periodRange.end
                    };
                }
            }

            if (!paidOnly) {
                const { rows, count } = await Order.findAndCountAll({
                    where,
                    order: [[sortField, sortOrder]],
                    offset,
                    limit
                });

                const enriched = await Promise.all(rows.map((order) => enrichOrderProducts(order)));
                const allocation = await buildAccountingAllocation(enriched, req.admin?.phoneNumber);
                const enrichedWithAccounts = enriched.map((order) => ({
                    ...order,
                    accountName: allocation.accountNameByOrderId[order.id] || WITHOUT_LINK_ACCOUNT_NAME
                }));

                return res.json({ data: enrichedWithAccounts, total: count });
            }

            const paidOrders = await Order.findAll({
                where,
                order: [[sortField, sortOrder]]
            });
            const enrichedPaidOrders = await Promise.all(paidOrders.map((order) => enrichOrderProducts(order)));
            const virtualPaidOrders = await getPaidConnectionsWithoutOrder(periodRange, filter.phoneNumber);
            const accountingContext = excludeIvanDasha ? await buildAccountingContext() : null;
            const filteredMergedRows =
                excludeIvanDasha && accountingContext
                    ? excludeOrdersByAccountingAccounts([...enrichedPaidOrders, ...virtualPaidOrders], accountingContext)
                    : [...enrichedPaidOrders, ...virtualPaidOrders];
            const mergedRows = filteredMergedRows.sort((a, b) => {
                const aValue = a[sortField];
                const bValue = b[sortField];
                const aTs = new Date(aValue).getTime();
                const bTs = new Date(bValue).getTime();

                if (Number.isFinite(aTs) && Number.isFinite(bTs)) {
                    return sortOrder === 'ASC' ? aTs - bTs : bTs - aTs;
                }

                if (aValue === bValue) {
                    return 0;
                }

                if (sortOrder === 'ASC') {
                    return aValue > bValue ? 1 : -1;
                }

                return aValue < bValue ? 1 : -1;
            });

            const pagedRows = mergedRows.slice(offset, offset + limit);
            const allocation = await buildAccountingAllocation(pagedRows, req.admin?.phoneNumber, accountingContext);
            const mergedRowsWithAccounts = pagedRows.map((order) => ({
                ...order,
                accountName: allocation.accountNameByOrderId[order.id] || WITHOUT_LINK_ACCOUNT_NAME
            }));

            return res.json({ data: mergedRowsWithAccounts, total: mergedRows.length });
        } catch (error) {
            return res.status(500).json({ message: 'Не удалось получить список заказов', error: error.message });
        }
    },

    async getOrder(req, res) {
        try {
            const order = await Order.findByPk(req.params.id);

            if (!order) {
                return res.status(404).json({ message: 'Заказ не найден' });
            }

            const enriched = await enrichOrderProducts(order);

            return res.json({ data: enriched });
        } catch (error) {
            return res.status(500).json({ message: 'Не удалось получить заказ', error: error.message });
        }
    },

    async createOrder(req, res) {
        const decreasedStocks = [];

        try {
            const customerName = String(req.body.customerName || '').trim();
            const addressIndex = String(req.body.addressIndex || '').trim();
            const city = String(req.body.city || '').trim();
            const street = String(req.body.street || '').trim();
            const houseNumber = String(req.body.houseNumber || '').trim();
            const deliveryMethod = String(req.body.deliveryMethod || '').trim().toLowerCase();
            const products = normalizeOrderProducts(req.body.products);
            const phoneNumber = String(req.body.phoneNumber || '').replace(/\D/g, '').slice(-10);
            const kaspiNumber = req.body.kaspiNumber
                ? String(req.body.kaspiNumber).replace(/\D/g, '').slice(-10)
                : null;
            const paymentLinkConnectionIdRaw = Number(req.body.paymentLinkConnectionId);
            const paymentLinkConnectionId =
                Number.isInteger(paymentLinkConnectionIdRaw) && paymentLinkConnectionIdRaw > 0
                    ? paymentLinkConnectionIdRaw
                    : null;

            if (!customerName || !addressIndex || !city || !street || !houseNumber || !phoneNumber || !deliveryMethod) {
                return res.status(400).json({ message: 'Заполните обязательные поля заказа' });
            }

            if (phoneNumber.length !== 10) {
                return res.status(400).json({ message: 'Телефон должен содержать 10 цифр без +7' });
            }

            if (kaspiNumber && kaspiNumber.length !== 10) {
                return res.status(400).json({ message: 'Kaspi номер должен содержать 10 цифр без +7' });
            }

            if (products.length === 0) {
                return res.status(400).json({ message: 'Добавьте хотя бы один товар в заказ' });
            }

            const allowedDeliveryMethods = ['kazpost', 'indrive', 'city'];
            if (!allowedDeliveryMethods.includes(deliveryMethod)) {
                return res.status(400).json({ message: 'Некорректный способ доставки' });
            }

            const uniqueTypeIds = [...new Set(products.map((item) => item.typeId))];
            const typeRows = await ProductType.findAll({
                where: {
                    id: {
                        [Op.in]: uniqueTypeIds
                    }
                },
                include: [{ model: Product, attributes: ['id', 'name'] }]
            });
            const typeById = new Map(typeRows.map((row) => [row.id, row]));

            const validatedProducts = products.map((item) => {
                const typeRow = typeById.get(item.typeId);

                if (!typeRow) {
                    return { error: `Тип товара с ID ${item.typeId} не найден` };
                }

                if (typeRow.productId !== item.productId) {
                    return { error: `Тип товара ${item.typeId} не принадлежит товару ${item.productId}` };
                }

                const availableStock = typeRow.stockQuantity;
                if (availableStock !== null && availableStock < item.quantity) {
                    return { error: `Недостаточно остатка: ${typeRow.type}. Доступно ${availableStock} шт.` };
                }

                return {
                    productId: item.productId,
                    typeId: item.typeId,
                    quantity: item.quantity,
                    unitPrice: safeAmount(typeRow.price),
                    typeName: typeRow.type,
                    productName: typeRow.product ? typeRow.product.name : null,
                    stockQuantity: typeRow.stockQuantity
                };
            });

            const invalidProduct = validatedProducts.find((item) => item.error);
            if (invalidProduct) {
                return res.status(400).json({ message: invalidProduct.error });
            }

            for (const item of validatedProducts) {
                const typeRow = typeById.get(item.typeId);
                if (typeRow.stockQuantity === null) {
                    continue;
                }

                await typeRow.update({
                    stockQuantity: typeRow.stockQuantity - item.quantity
                });

                decreasedStocks.push({
                    typeId: typeRow.id,
                    quantity: item.quantity
                });
            }

            const productsTotal = validatedProducts.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
            const autoDeliveryCost = calculateDeliveryCostForAdminOrder(deliveryMethod, validatedProducts);
            const deliveryPriceOverride = req.body.deliveryPriceOverride;
            const hasDeliveryOverride =
                deliveryPriceOverride !== null &&
                deliveryPriceOverride !== undefined &&
                deliveryPriceOverride !== '';
            const manualDeliveryCost = hasDeliveryOverride ? safeAmount(deliveryPriceOverride) : null;
            const deliveryCost = hasDeliveryOverride && manualDeliveryCost >= 0 ? manualDeliveryCost : autoDeliveryCost;
            const totalPrice = productsTotal + deliveryCost;

            const orderPayload = {
                customerName,
                addressIndex,
                city,
                street,
                houseNumber,
                phoneNumber,
                kaspiNumber,
                deliveryMethod,
                paymentMethod: 'link',
                products: validatedProducts.map((item) => ({
                    productId: item.productId,
                    typeId: item.typeId,
                    quantity: item.quantity
                })),
                totalPrice
            };

            let paymentLinkConnection = null;
            if (paymentLinkConnectionId) {
                paymentLinkConnection = await SentPaymentLink.findByPk(paymentLinkConnectionId);
                if (!paymentLinkConnection) {
                    return res.status(400).json({ message: 'Связь клиент-ссылка не найдена' });
                }

                if (paymentLinkConnection.linkedOrderId) {
                    return res.status(409).json({ message: 'Эта связь уже привязана к другому заказу' });
                }

                const connectionPhone = normalizePhoneNumber(paymentLinkConnection.customerPhone);
                if (!connectionPhone || connectionPhone !== phoneNumber) {
                    return res.status(400).json({ message: 'Телефон заказа не совпадает с телефоном в выбранной связи' });
                }

                orderPayload.paymentLink = String(paymentLinkConnection.paymentLink || '').trim();
                if (paymentLinkConnection.sellerIin) {
                    orderPayload.paymentSellerIin = String(paymentLinkConnection.sellerIin);
                }
                if (paymentLinkConnection.sellerAdminName) {
                    orderPayload.paymentSellerName = String(paymentLinkConnection.sellerAdminName);
                }
            } else {
                paymentLinkConnection = await attachRecentPaymentLinkToOrder(orderPayload, phoneNumber);
            }
            if (canAutoMarkOrderAsPaidByConnection(paymentLinkConnection, totalPrice)) {
                orderPayload.status = 'Оплачено';
            }

            const created = await Order.create(orderPayload);
            if (paymentLinkConnection?.id) {
                const isLinked = await markPaymentLinkConnectionAsUsed(paymentLinkConnection.id, created.id);
                if (!isLinked) {
                    await created.destroy();
                    const conflictError = new Error('Эта связь уже привязана к другому заказу');
                    conflictError.statusCode = 409;
                    throw conflictError;
                }
            }
            const enriched = await enrichOrderProducts(created);

            try {
                await sendMessageToChannel(created);
            } catch (_error) {
                // Не блокируем создание заказа, если уведомление в канал не отправилось.
            }

            const productDetails = validatedProducts
                .map((product) => `
Название: ${product.productName || 'Продукт не найден'}
Тип: ${product.typeName || 'Тип не найден'}
Количество: ${product.quantity}
`)
                .join('\n');

            const notificationMessage = `
Имя и Фамилия: *${customerName}*
Номер телефона: *${phoneNumber}*
Номер телефона Kaspi: *${kaspiNumber}*
Город: *${city}*
Адрес: *${street}, ${houseNumber}*
Почтовый индекс: *${addressIndex}*
Метод доставки: *${deliveryMethod}*
Метод оплаты: *link*
Итоговая сумма: *${totalPrice}* тенге

*Товары*:
${productDetails}`;

            await sendNotification(phoneNumber, notificationMessage);
            await sendNotification(phoneNumber, `Ваш заказ создан. Оплатите счет на сумму *${totalPrice}* тенге в приложении Каспи.`);

            return res.status(201).json({
                data: {
                    ...enriched,
                    deliveryCost,
                    productsTotal
                }
            });
        } catch (error) {
            if (decreasedStocks.length > 0) {
                await Promise.all(
                    decreasedStocks.map(async (item) => {
                        const typeRow = await ProductType.findByPk(item.typeId);
                        if (!typeRow || typeRow.stockQuantity === null) {
                            return;
                        }

                        await typeRow.update({
                            stockQuantity: typeRow.stockQuantity + item.quantity
                        });
                    })
                );
            }

            return res.status(error.statusCode || 500).json({ message: 'Не удалось создать заказ', error: error.message });
        }
    },

    async updateOrder(req, res) {
        try {
            const order = await Order.findByPk(req.params.id);

            if (!order) {
                return res.status(404).json({ message: 'Заказ не найден' });
            }

            const allowedFields = [
                'customerName',
                'addressIndex',
                'city',
                'street',
                'houseNumber',
                'phoneNumber',
                'deliveryMethod',
                'paymentMethod',
                'products',
                'totalPrice',
                'kaspiNumber',
                'paymentLink',
                'status',
                'trackingNumber'
            ];

            const payload = {};
            allowedFields.forEach((field) => {
                if (req.body[field] !== undefined) {
                    payload[field] = req.body[field];
                }
            });

            if (payload.phoneNumber) {
                payload.phoneNumber = String(payload.phoneNumber).replace(/\D/g, '').slice(-10);
            }

            if (payload.products && typeof payload.products === 'string') {
                payload.products = parseJsonParam(payload.products, order.products);
            }

            await order.update(payload);
            const enriched = await enrichOrderProducts(order);

            return res.json({ data: enriched });
        } catch (error) {
            return res.status(500).json({ message: 'Не удалось обновить заказ', error: error.message });
        }
    },

    async deleteOrder(req, res) {
        try {
            const order = await Order.findByPk(req.params.id);

            if (!order) {
                return res.status(404).json({ message: 'Заказ не найден' });
            }

            const orderJson = await enrichOrderProducts(order);
            await order.destroy();

            return res.json({ data: orderJson });
        } catch (error) {
            return res.status(500).json({ message: 'Не удалось удалить заказ', error: error.message });
        }
    },

    async getDashboardAnalytics(req, res) {
        try {
            const ranges = getDashboardRanges(req.query.period);
            const [orders, expenses, products] = await Promise.all([
                Order.findAll({
                    where: {
                        status: { [Op.in]: PAID_ORDER_STATUSES },
                        createdAt: {
                            [Op.gte]: ranges.maxStart,
                            [Op.lte]: ranges.now
                        }
                    },
                    order: [['createdAt', 'DESC']]
                }),
                Expense.findAll({
                    where: {
                        spentAt: {
                            [Op.gte]: ranges.maxStart,
                            [Op.lte]: ranges.now
                        }
                    },
                    order: [['spentAt', 'DESC']]
                }),
                Product.findAll({ attributes: ['id', 'name'] })
            ]);

            const orderRows = orders.map((order) => order.toJSON());
            const expenseRows = expenses.map((expense) => expense.toJSON());
            const productNameById = new Map(products.map((item) => [item.id, item.name]));
            const { orderSeries, financeSeries } = buildDashboardSeries(orderRows, expenseRows, ranges);

            const selectedFinance = financeSeries[ranges.selectedPeriod] || [];
            const selectedTurnover = selectedFinance.reduce((sum, point) => sum + safeAmount(point.turnover), 0);
            const selectedExpenses = selectedFinance.reduce((sum, point) => sum + safeAmount(point.expenses), 0);
            const selectedProfit = selectedTurnover - selectedExpenses;
            const selectedRange = ranges[ranges.selectedPeriod];
            const selectedOrders = orderRows.filter((order) => {
                const createdAt = new Date(order.createdAt);
                return !Number.isNaN(createdAt.getTime()) && withinRange(createdAt, selectedRange);
            });
            const topProducts = buildTopProducts(selectedOrders, productNameById);

            return res.json({
                data: {
                    period: ranges.selectedPeriod,
                    orderSeries,
                    financeSeries,
                    topProducts,
                    financialSummary: {
                        revenue: selectedTurnover,
                        expenses: selectedExpenses,
                        profit: selectedProfit,
                        ordersCount: selectedOrders.length
                    },
                    productSales: topProducts
                }
            });
        } catch (error) {
            return res.status(500).json({ message: 'Не удалось получить аналитику дашборда', error: error.message });
        }
    },

    async getAccountingSummary(req, res) {
        try {
            const filter = parseJsonParam(req.query.filter, {});
            const period = req.query.period || filter.period;
            const range = getOrderPeriodRange(period);

            const ordersWhere = {
                status: { [Op.in]: PAID_ORDER_STATUSES }
            };
            const expensesWhere = {};

            if (range) {
                ordersWhere.createdAt = {
                    [Op.gte]: range.start,
                    [Op.lte]: range.end
                };
                expensesWhere.spentAt = {
                    [Op.gte]: range.start,
                    [Op.lte]: range.end
                };
            }

            const [orders, expenses, virtualPaidOrders] = await Promise.all([
                Order.findAll({ where: ordersWhere, order: [['createdAt', 'DESC']] }),
                Expense.findAll({ where: expensesWhere, order: [['spentAt', 'DESC']] }),
                getPaidConnectionsWithoutOrder(range)
            ]);

            const accountingContext = await buildAccountingContext();
            const allPaidOrders = [...orders.map((order) => order.toJSON()), ...virtualPaidOrders];
            const filteredPaidOrders = excludeOrdersByAccountingAccounts(allPaidOrders, accountingContext);
            const ordersTotal = filteredPaidOrders.reduce((sum, order) => sum + safeAmount(order.totalPrice), 0);
            const expensesTotal = expenses.reduce((sum, item) => sum + safeAmount(item.amount), 0);
            const balance = ordersTotal - expensesTotal;
            const allocation = await buildAccountingAllocation(filteredPaidOrders, req.admin?.phoneNumber, accountingContext);

            return res.json({
                data: {
                    ordersTotal,
                    expensesTotal,
                    balance,
                    ordersCount: filteredPaidOrders.length,
                    expensesCount: expenses.length,
                    allocations: allocation
                }
            });
        } catch (error) {
            return res.status(500).json({ message: 'Не удалось получить сводку бухгалтерии', error: error.message });
        }
    },

    async getAccountingAdmins(req, res) {
        try {
            const admins = await getActiveAdmins();
            const currentAdminPhone = normalizeAdminPhone(req.admin?.phoneNumber);
            const visibleAdmins = filterRestrictedAdmins(admins, currentAdminPhone, (item) => item.phoneNumber);

            return res.json({
                data: visibleAdmins.map((admin) => ({
                    id: admin.id,
                    phoneNumber: admin.phoneNumber,
                    fullName: admin.fullName,
                    iin: admin.iin
                }))
            });
        } catch (error) {
            return res.status(500).json({ message: 'Не удалось получить список администраторов', error: error.message });
        }
    },

    async getAdmins(req, res) {
        try {
            const admins = await getActiveAdmins();
            const currentAdminPhone = normalizeAdminPhone(req.admin?.phoneNumber);
            const visibleAdmins = filterRestrictedAdmins(admins, currentAdminPhone, (item) => item.phoneNumber);

            return res.json({
                data: visibleAdmins,
                total: visibleAdmins.length
            });
        } catch (error) {
            return res.status(500).json({ message: 'Не удалось получить список администраторов', error: error.message });
        }
    },

    async createAdmin(req, res) {
        try {
            const fullName = String(req.body.fullName || '').trim();
            const phoneNumber = normalizeAdminPhone(req.body.phoneNumber);
            const iin = normalizeAdminIin(req.body.iin);

            if (!fullName) {
                return res.status(400).json({ message: 'Укажите имя администратора' });
            }

            if (!phoneNumber) {
                return res.status(400).json({ message: 'Некорректный номер телефона' });
            }
            if (!iin) {
                return res.status(400).json({ message: 'ИИН должен содержать 12 цифр' });
            }

            const existing = await AdminUser.findOne({
                where: { phoneNumber }
            });
            const iinOwner = await AdminUser.findOne({
                where: {
                    iin,
                    phoneNumber: {
                        [Op.ne]: phoneNumber
                    }
                }
            });

            if (iinOwner) {
                return res.status(400).json({ message: 'Этот ИИН уже привязан к другому администратору' });
            }

            if (existing) {
                await existing.update({
                    fullName,
                    iin,
                    isActive: true
                });

                return res.status(200).json({ data: existing.toJSON() });
            }

            const created = await AdminUser.create({
                fullName,
                phoneNumber,
                iin,
                isActive: true
            });

            return res.status(201).json({ data: created.toJSON() });
        } catch (error) {
            return res.status(500).json({ message: 'Не удалось добавить администратора', error: error.message });
        }
    },

    async updateAdmin(req, res) {
        try {
            const adminId = Number(req.params.id);
            const fullName = String(req.body.fullName || '').trim();
            const phoneNumber = normalizeAdminPhone(req.body.phoneNumber);
            const iin = normalizeAdminIin(req.body.iin);
            const currentAdminPhone = normalizeAdminPhone(req.admin?.phoneNumber);

            if (!Number.isFinite(adminId)) {
                return res.status(400).json({ message: 'Некорректный ID администратора' });
            }

            if (!fullName) {
                return res.status(400).json({ message: 'Укажите имя администратора' });
            }

            if (!phoneNumber) {
                return res.status(400).json({ message: 'Некорректный номер телефона' });
            }

            if (!iin) {
                return res.status(400).json({ message: 'ИИН должен содержать 12 цифр' });
            }

            const adminUser = await AdminUser.findByPk(adminId);
            if (!adminUser || !adminUser.isActive) {
                return res.status(404).json({ message: 'Администратор не найден' });
            }

            if (!canCurrentAdminSeeTargetAdmin(currentAdminPhone, adminUser.phoneNumber)) {
                return res.status(403).json({ message: 'Нельзя редактировать этого администратора' });
            }

            if (!canCurrentAdminSeeTargetAdmin(currentAdminPhone, phoneNumber)) {
                return res.status(403).json({ message: 'Нельзя назначить этот номер телефона' });
            }

            const phoneOwner = await AdminUser.findOne({
                where: { phoneNumber }
            });
            const iinOwner = await AdminUser.findOne({
                where: { iin }
            });
            if (phoneOwner && Number(phoneOwner.id) !== adminId) {
                return res.status(400).json({ message: 'Этот номер телефона уже привязан к другому администратору' });
            }
            if (iinOwner && Number(iinOwner.id) !== adminId) {
                return res.status(400).json({ message: 'Этот ИИН уже привязан к другому администратору' });
            }

            await adminUser.update({
                fullName,
                phoneNumber,
                iin
            });

            return res.json({ data: adminUser.toJSON() });
        } catch (error) {
            return res.status(500).json({ message: 'Не удалось обновить администратора', error: error.message });
        }
    },

    async deleteAdmin(req, res) {
        try {
            const adminId = Number(req.params.id);

            if (!Number.isFinite(adminId)) {
                return res.status(400).json({ message: 'Некорректный ID администратора' });
            }

            const adminUser = await AdminUser.findByPk(adminId);
            if (!adminUser || !adminUser.isActive) {
                return res.status(404).json({ message: 'Администратор не найден' });
            }

            if (String(adminUser.phoneNumber) === String(normalizeAdminPhone(req.admin?.phoneNumber))) {
                return res.status(400).json({ message: 'Нельзя удалить текущего авторизованного администратора' });
            }

            await adminUser.update({ isActive: false });

            return res.json({ data: adminUser.toJSON() });
        } catch (error) {
            return res.status(500).json({ message: 'Не удалось удалить администратора', error: error.message });
        }
    },

    async getAccountingPaymentLinks(req, res) {
        try {
            const links = await PaymentLink.findAll({
                where: { isActive: true },
                order: [['createdAt', 'DESC']]
            });
            const currentAdminPhone = normalizeAdminPhone(req.admin?.phoneNumber);
            const visibleLinks = filterRestrictedAdmins(links, currentAdminPhone, (item) => item.adminPhone);

            return res.json({
                data: visibleLinks.map((item) => item.toJSON())
            });
        } catch (error) {
            return res.status(500).json({ message: 'Не удалось получить список ссылок', error: error.message });
        }
    },

    async getPaymentLinkDispatchPlan(req, res) {
        try {
            const currentAdminPhone = normalizeAdminPhone(req.admin?.phoneNumber);
            const plan = await getVisibleDispatchPlan(currentAdminPhone);

            return res.json({
                data: plan
            });
        } catch (error) {
            return res.status(500).json({ message: 'Не удалось получить цепь отправки ссылок', error: error.message });
        }
    },

    async savePaymentLinkDispatchPlan(req, res) {
        try {
            const currentAdminPhone = normalizeAdminPhone(req.admin?.phoneNumber);
            const chainRaw = Array.isArray(req.body?.chain) ? req.body.chain : [];

            const chain = chainRaw.map((item) => ({
                adminPhone: normalizeAdminPhone(item?.adminPhone),
                repeatCount: Math.max(1, Math.floor(Number(item?.repeatCount) || 1))
            }));

            const hasForbiddenAdmins = chain.some(
                (item) => !item.adminPhone || !canCurrentAdminSeeTargetAdmin(currentAdminPhone, item.adminPhone)
            );
            if (hasForbiddenAdmins) {
                return res.status(403).json({ message: 'Нельзя использовать администраторов вне вашей зоны видимости' });
            }

            const saved = await saveVisibleDispatchPlan(currentAdminPhone, chain);

            return res.json({
                data: saved
            });
        } catch (error) {
            return res.status(500).json({ message: 'Не удалось сохранить цепь отправки ссылок', error: error.message });
        }
    },

    async getPaymentLinkConnections(req, res) {
        try {
            const { offset, limit } = parsePagination(req.query);
            const filter = parseJsonParam(req.query.filter, {});
            const query = String(filter.q || '').trim();

            const where = {};
            if (query) {
                where[Op.or] = [
                    { customerPhone: { [Op.like]: `%${query}%` } },
                    { customerChatId: { [Op.like]: `%${query}%` } },
                    { paymentLink: { [Op.like]: `%${query}%` } }
                ];
            }

            const { rows, count } = await SentPaymentLink.findAndCountAll({
                where,
                order: [['receivedAt', 'DESC']],
                offset,
                limit
            });

            const linkedOrderIds = [
                ...new Set(
                    rows
                        .map((item) => Number(item.linkedOrderId))
                        .filter((value) => Number.isInteger(value) && value > 0)
                )
            ];
            const linkedOrders = linkedOrderIds.length
                ? await Order.findAll({
                      where: { id: { [Op.in]: linkedOrderIds } },
                      attributes: ['id', 'phoneNumber', 'status', 'paymentLink', 'createdAt']
                  })
                : [];
            const linkedOrdersById = new Map(linkedOrders.map((order) => [order.id, order]));

            const data = rows.map((item) => {
                const itemJson = item.toJSON();
                const linkedOrderId = Number(itemJson.linkedOrderId);
                const linkedOrder =
                    Number.isInteger(linkedOrderId) && linkedOrderId > 0 ? linkedOrdersById.get(linkedOrderId) || null : null;

                const paymentLinkDisplay =
                    itemJson.sellerAdminName && (!itemJson.paymentLink || itemJson.paymentLink === 'терминал')
                        ? itemJson.sellerAdminName
                        : itemJson.paymentLink;

                return {
                    id: itemJson.id,
                    customerPhone: itemJson.customerPhone,
                    customerChatId: itemJson.customerChatId,
                    paymentLink: paymentLinkDisplay,
                    expectedAmount: itemJson.expectedAmount,
                    paidAmount: itemJson.paidAmount,
                    isPaid: itemJson.isPaid,
                    paidAt: itemJson.paidAt,
                    paymentProofUrl: itemJson.paymentProofUrl,
                    messageId: itemJson.messageId,
                    receivedAt: itemJson.receivedAt,
                    sourceDescription: itemJson.sourceDescription,
                    linkedOrderId: itemJson.linkedOrderId,
                    usedAt: itemJson.usedAt,
                    orderId: linkedOrder ? linkedOrder.id : null,
                    orderStatus: linkedOrder ? linkedOrder.status : null,
                    orderCreatedAt: linkedOrder ? linkedOrder.createdAt : null,
                    hasOrder: Boolean(linkedOrder)
                };
            });

            return res.json({ data, total: count });
        } catch (error) {
            return res.status(500).json({ message: 'Не удалось получить связи клиентов и ссылок', error: error.message });
        }
    },

    async deletePaymentLinkConnection(req, res) {
        try {
            const connection = await SentPaymentLink.findByPk(req.params.id);

            if (!connection) {
                return res.status(404).json({ message: 'Связь не найдена' });
            }

            const connectionJson = connection.toJSON();
            await connection.destroy();

            return res.json({ data: connectionJson });
        } catch (error) {
            return res.status(500).json({ message: 'Не удалось удалить связь', error: error.message });
        }
    },

    async createAccountingPaymentLink(req, res) {
        try {
            const url = normalizePaymentLink(req.body.url);
            const adminPhone = normalizeAdminPhone(req.body.adminPhone);
            const adminProfile = await getAdminByPhone(adminPhone);

            if (!url) {
                return res.status(400).json({ message: 'Укажите ссылку' });
            }

            try {
                // Проверяем корректность URL перед сохранением.
                // eslint-disable-next-line no-new
                new URL(url);
            } catch (_error) {
                return res.status(400).json({ message: 'Ссылка должна быть корректным URL' });
            }

            if (!adminProfile) {
                return res.status(400).json({ message: 'Выберите администратора из списка разрешенных' });
            }

            const existingLink = await PaymentLink.findOne({
                where: {
                    url
                }
            });

            if (existingLink) {
                await existingLink.update({
                    adminPhone,
                    adminName: adminProfile.fullName,
                    isActive: true
                });

                return res.status(200).json({ data: existingLink.toJSON() });
            }

            const created = await PaymentLink.create({
                url,
                adminPhone,
                adminName: adminProfile.fullName,
                isActive: true
            });

            return res.status(201).json({ data: created.toJSON() });
        } catch (error) {
            return res.status(500).json({ message: 'Не удалось сохранить ссылку', error: error.message });
        }
    },

    async deleteAccountingPaymentLink(req, res) {
        try {
            const paymentLink = await PaymentLink.findByPk(req.params.id);

            if (!paymentLink || !paymentLink.isActive) {
                return res.status(404).json({ message: 'Ссылка не найдена' });
            }

            await paymentLink.update({ isActive: false });

            return res.json({ data: paymentLink.toJSON() });
        } catch (error) {
            return res.status(500).json({ message: 'Не удалось удалить ссылку', error: error.message });
        }
    },

    async getExpenses(req, res) {
        try {
            const { offset, limit } = parsePagination(req.query);
            const [sortField, sortOrder] = parseSort(req.query, 'spentAt', 'DESC');
            const filter = parseJsonParam(req.query.filter, {});

            const where = {};
            if (filter.q) {
                const query = `%${String(filter.q).trim()}%`;
                where[Op.or] = [
                    { category: { [Op.like]: query } },
                    { description: { [Op.like]: query } },
                    { spentByName: { [Op.like]: query } }
                ];
            }

            if (filter.period) {
                const range = getOrderPeriodRange(filter.period);
                if (range) {
                    where.spentAt = {
                        [Op.gte]: range.start,
                        [Op.lte]: range.end
                    };
                }
            }

            const { rows, count } = await Expense.findAndCountAll({
                where,
                order: [[sortField, sortOrder]],
                offset,
                limit
            });

            return res.json({ data: rows.map((item) => item.toJSON()), total: count });
        } catch (error) {
            return res.status(500).json({ message: 'Не удалось получить расходы', error: error.message });
        }
    },

    async createExpense(req, res) {
        try {
            const amount = safeAmount(req.body.amount);
            const category = String(req.body.category || '').trim();
            const description = req.body.description ? String(req.body.description).trim() : '';
            const spentAt = req.body.spentAt ? new Date(req.body.spentAt) : new Date();
            const adminPhone = normalizeAdminPhone(req.admin?.phoneNumber) || '';
            const adminProfile = await getAdminByPhone(adminPhone);

            if (!category) {
                return res.status(400).json({ message: 'Укажите категорию расхода' });
            }

            if (!Number.isFinite(amount) || amount <= 0) {
                return res.status(400).json({ message: 'Сумма расхода должна быть больше 0' });
            }

            if (Number.isNaN(spentAt.getTime())) {
                return res.status(400).json({ message: 'Некорректная дата расхода' });
            }

            const expense = await Expense.create({
                amount,
                category,
                description,
                spentAt,
                spentByPhone: adminPhone,
                spentByName: adminProfile ? adminProfile.fullName : `+7${adminPhone}`
            });

            return res.status(201).json({ data: expense.toJSON() });
        } catch (error) {
            return res.status(500).json({ message: 'Не удалось добавить расход', error: error.message });
        }
    },

    async deleteExpense(req, res) {
        try {
            const expense = await Expense.findByPk(req.params.id);

            if (!expense) {
                return res.status(404).json({ message: 'Расход не найден' });
            }

            const expenseJson = expense.toJSON();
            await expense.destroy();

            return res.json({ data: expenseJson });
        } catch (error) {
            return res.status(500).json({ message: 'Не удалось удалить расход', error: error.message });
        }
    },

    async getInventoryTypes(req, res) {
        try {
            const { offset, limit } = parsePagination(req.query);
            const filter = parseJsonParam(req.query.filter, {});
            const query = String(filter.q || '').trim().toLowerCase();

            const rows = await getFlattenedInventory();
            const filteredRows = query
                ? rows.filter((item) => {
                      const haystack = `${item.productName} ${item.typeName} ${item.code}`.toLowerCase();
                      return haystack.includes(query);
                  })
                : rows;

            const pagedRows = filteredRows.slice(offset, offset + limit);

            return res.json({ data: pagedRows, total: filteredRows.length });
        } catch (error) {
            return res.status(500).json({ message: 'Не удалось получить остатки', error: error.message });
        }
    },

    async receiveInventory(req, res) {
        try {
            const code = String(req.body.code || '').trim();
            const quantity = Math.floor(Number(req.body.quantity));

            if (!code) {
                return res.status(400).json({ message: 'Укажите код товара для прихода' });
            }

            if (!Number.isFinite(quantity) || quantity <= 0) {
                return res.status(400).json({ message: 'Количество должно быть положительным числом' });
            }

            const productType = await ProductType.findOne({
                where: { code },
                include: [{ model: Product, attributes: ['id', 'name'] }]
            });

            if (!productType) {
                return res.status(404).json({ message: 'Тип товара с таким кодом не найден' });
            }

            const currentStock = productType.stockQuantity;
            const nextStock = currentStock === null ? quantity : currentStock + quantity;

            await productType.update({ stockQuantity: nextStock });

            const productName = productType.product ? productType.product.name : 'Товар';
            const serialized = serializeType(productType, productName);

            return res.json({
                data: {
                    id: productType.id,
                    productId: productType.productId,
                    productName,
                    typeName: productType.type,
                    addedQuantity: quantity,
                    stockQuantity: productType.stockQuantity,
                    stockStatus: serialized.stockStatus,
                    code: serialized.code,
                    qrCodeUrl: serialized.qrCodeUrl
                }
            });
        } catch (error) {
            return res.status(500).json({ message: 'Не удалось провести приход товара', error: error.message });
        }
    },

    async getQrCodes(req, res) {
        try {
            const rows = await getFlattenedInventory();
            return res.json({ data: rows, total: rows.length });
        } catch (error) {
            return res.status(500).json({ message: 'Не удалось получить QR-коды', error: error.message });
        }
    },

    async getOrderBundle(req, res) {
        try {
            const code = String(req.params.code || '').trim();

            if (!ORDER_BUNDLE_CODE_REGEX.test(code)) {
                return res.status(400).json({ message: 'Некорректный код заказа из QR' });
            }

            const bundleRow = await OrderBundle.findOne({
                where: { code },
                attributes: ['id', 'code', 'payload', 'createdAt']
            });

            if (!bundleRow) {
                return res.status(404).json({ message: 'QR-пакет заказа не найден' });
            }

            const parsed = parseOrderBundlePayload(bundleRow.payload);
            if (!parsed) {
                return res.status(422).json({ message: 'QR-пакет заказа повреждён или имеет неверный формат' });
            }

            return res.json({
                data: {
                    id: bundleRow.id,
                    code: bundleRow.code,
                    createdAt: bundleRow.createdAt,
                    ...parsed
                }
            });
        } catch (error) {
            return res.status(500).json({ message: 'Не удалось получить данные заказа из QR', error: error.message });
        }
    },

    async updateInventoryTypeAlias(req, res) {
        try {
            const typeId = Number(req.params.id);
            if (!Number.isFinite(typeId)) {
                return res.status(400).json({ message: 'Некорректный id типа товара' });
            }

            const rawAlias = req.body?.alias;
            const alias =
                rawAlias === undefined || rawAlias === null || String(rawAlias).trim() === ''
                    ? null
                    : String(rawAlias).trim();

            const typeRecord = await ProductType.findByPk(typeId, {
                include: [{ model: Product, attributes: ['id', 'name'] }]
            });

            if (!typeRecord) {
                return res.status(404).json({ message: 'Тип товара не найден' });
            }

            await typeRecord.update({ alias });

            const productName = typeRecord.product ? typeRecord.product.name : 'Товар';
            const code = buildProductTypeCode(typeRecord.productId, typeRecord.id) || typeRecord.code || '';

            return res.json({
                data: {
                    id: typeRecord.id,
                    productId: typeRecord.productId,
                    productName,
                    typeName: typeRecord.type,
                    alias: typeRecord.alias,
                    typePrice: typeRecord.price,
                    stockQuantity: typeRecord.stockQuantity,
                    stockStatus: typeRecord.stockQuantity === null ? 'Бесконечность' : `${typeRecord.stockQuantity} шт.`,
                    code,
                    qrCodeUrl: buildQrCodeUrl(code)
                }
            });
        } catch (error) {
            return res.status(500).json({ message: 'Не удалось обновить псевдоним', error: error.message });
        }
    }
};

module.exports = adminController;
