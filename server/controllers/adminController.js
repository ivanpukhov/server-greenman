const Sequelize = require('sequelize');
const Product = require('../models/Product');
const ProductType = require('../models/ProductType');
const Order = require('../models/orders/Order');
const Expense = require('../models/orders/Expense');
const AdminUser = require('../models/orders/AdminUser');
const SentPaymentLink = require('../models/orders/SentPaymentLink');
const OrderBundle = require('../models/orders/OrderBundle');
const KazpostRequest = require('../models/orders/KazpostRequest');
const OrderDraftRequest = require('../models/orders/OrderDraftRequest');
const { buildProductTypeCode, buildQrCodeUrl } = require('../utilities/productTypeCode');
const { storeProductImage } = require('../utilities/productImageStorage');
const PaymentLink = require('../models/orders/PaymentLink');
const sendFileNotification = require('../utilities/sendFileNotification');
const sendMessageToChannel = require('../utilities/sendMessageToChannel');
const sendNotification = require('../utilities/notificationService');
const orderTrackingQueueService = require('../utilities/orderTrackingQueueService');
const { sendOrderTrackingTemplate, sendAuthTemplate } = sendNotification;
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
const { retryKazpostRequestProcessing, retryOrderDraftRequestProcessing } = require('../routes/whatsappWebhookRoutes');
const { buildErrorDetails, formatErrorMessage } = require('../utilities/errorDetails');

const { Op } = Sequelize;
const IVAN_ADMIN_PHONE = '7073670497';
const DASHA_ADMIN_IIN = '001010650383';
const PAID_ORDER_STATUSES = ['Оплачено', 'Отправлено', 'Доставлено'];
const WITHOUT_LINK_ACCOUNT_NAME = 'Без ссылки';
const EXCLUDED_ACCOUNT_NAME_TOKENS = new Set(['иван', 'даша']);
const ORDER_BUNDLE_CODE_REGEX = /^ob_[A-Za-z0-9]{6,24}$/;
const PAYMENT_LINK_FOOTER =
    'После оплаты скиньте пожалуйста чек\n‼️Без чека отправки не будет';
const INCOMING_MESSAGE_GREETING =
    'Вас приветствует команда травника Greenman 🌿\n\n' +
    '‼️Чтобы получить качественную консультацию и быстро оформить заказ,          внимательно заполните анкету.\n\n' +
    '📋 Для консультации по подбору трав укажите:\n\n' +
    '1️⃣ Возраст\n' +
    '2️⃣ Вес\n' +
    '3️⃣ Хронические заболевания\n' +
    '4️⃣ Что вас беспокоит\n' +
    '5️⃣ Поставленный диагноз\n' +
    '6️⃣ Результаты обследований (УЗИ, анализы и др.)\n\n' +
    '📎 Если есть обследования — прикрепляйте сразу.\n' +
    '❗️Особенно важно чётко указать диагноз.\n\n' +
    '⸻\n\n' +
    '📦 Для отправки заказа по почте сразу оставьте:\n\n' +
    '• Фамилия, имя, отчество\n' +
    '• Город\n' +
    '• Полный адрес\n' +
    '• Индекс почтового отделения\n' +
    '• Номер телефона\n\n' +
    '⸻\n\n' +
    '🛒 Если консультация не нужна и вы уже определились:\n\n' +
    'Обязательно укажите:\n\n' +
    '• Название продукции\n' +
    '• Форму — на мёду / на водно-спиртовой основе / в пакетиках для заваривания\n' +
    '• Количество\n' +
    '• Данные для отправки\n\n' +
    'Также вы можете оформить заказ напрямую на сайте:\n' +
    '🌍 Сайт для Казахстана\n' +
    'https://greenman.kz\n\n' +
    '🌍 Сайт для России\n' +
    'https://green-man.ru \n\n' +
    '⸻\n\n' +
    '⏳ Отвечаем в порядке очереди. В будние дни с 9-17часов\n\n' +
    '➡️Запросов на консультацию много, поэтому, чтобы вас обслужили быстрее — заполните анкету максимально полно и понятно.\n\n' +
    'В освободившееся окно мы свяжемся с вами, подберём индивидуальный курс и отправим посылку 🌿';

const filterRestrictedAdmins = (items, currentAdminPhone, getItemPhone) => {
    return items.filter((item) => canCurrentAdminSeeTargetAdmin(currentAdminPhone, getItemPhone(item)));
};

const isIvanPhone = (phone) => normalizeAdminPhone(phone) === IVAN_ADMIN_PHONE;

const canCurrentAdminManageIvanSiteOrdersToggle = (currentAdminPhone) => isIvanPhone(currentAdminPhone);

const isDashaByIin = (iin) => normalizeAdminIin(iin) === DASHA_ADMIN_IIN;

const isAskhatAdmin = (adminLike) => String(adminLike?.fullName || '').trim().toLowerCase() === 'асхат';

const parseIncomeExclusionPeriods = (value) => {
    if (!value) {
        return [];
    }

    try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed
            .map((item) => {
                const startAt = String(item?.startAt || '').trim();
                const endAt = String(item?.endAt || '').trim();
                return startAt ? { startAt, endAt: endAt || null } : null;
            })
            .filter(Boolean);
    } catch (_error) {
        return [];
    }
};

const stringifyIncomeExclusionPeriods = (periods) => JSON.stringify(parseIncomeExclusionPeriods(JSON.stringify(periods)));

const updateIncomeExclusionPeriods = (periods, shouldExcludeIncomeNow) => {
    const normalizedPeriods = Array.isArray(periods) ? periods.map((item) => ({ ...item })) : [];
    const lastPeriod = normalizedPeriods[normalizedPeriods.length - 1] || null;
    const hasOpenPeriod = Boolean(lastPeriod && lastPeriod.startAt && !lastPeriod.endAt);
    const nowIso = new Date().toISOString();

    if (shouldExcludeIncomeNow) {
        if (!hasOpenPeriod) {
            normalizedPeriods.push({ startAt: nowIso, endAt: null });
        }
        return normalizedPeriods;
    }

    if (hasOpenPeriod) {
        lastPeriod.endAt = nowIso;
    }

    return normalizedPeriods;
};

const toComparableTimestamp = (value) => {
    const ts = new Date(value).getTime();
    return Number.isFinite(ts) ? ts : null;
};

const isTimestampInIncomeExclusionPeriods = (timestamp, periods) => {
    if (!Number.isFinite(timestamp)) {
        return false;
    }

    return (Array.isArray(periods) ? periods : []).some((period) => {
        const startTs = toComparableTimestamp(period?.startAt);
        const endTs = period?.endAt ? toComparableTimestamp(period.endAt) : null;

        if (!Number.isFinite(startTs)) {
            return false;
        }

        if (timestamp < startTs) {
            return false;
        }

        if (endTs !== null && timestamp > endTs) {
            return false;
        }

        return true;
    });
};

const serializeAdminForResponse = (admin, currentAdmin = null) => {
    const plainAdmin = admin && typeof admin.toJSON === 'function' ? admin.toJSON() : admin;
    if (!plainAdmin) {
        return null;
    }

    const currentAdminPhone =
        typeof currentAdmin === 'string' ? normalizeAdminPhone(currentAdmin) : normalizeAdminPhone(currentAdmin?.phoneNumber);
    const currentAdminIin = typeof currentAdmin === 'string' ? null : normalizeAdminIin(currentAdmin?.iin);
    const canSeeIvanToggle = canCurrentAdminManageIvanSiteOrdersToggle(currentAdminPhone) && isIvanPhone(plainAdmin.phoneNumber);
    const canSeeAskhatAccountingToggle = currentAdminIin === DASHA_ADMIN_IIN && isAskhatAdmin(plainAdmin);
    const { siteOrdersToNataliaEnabled, includeInAccounting, ...rest } = plainAdmin;

    return {
        ...rest,
        ...(canSeeIvanToggle ? { siteOrdersToNataliaEnabled: Boolean(siteOrdersToNataliaEnabled) } : {}),
        ...(canSeeAskhatAccountingToggle ? { includeInAccounting: Boolean(includeInAccounting) } : {})
    };
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

const normalizePhoneToTenDigits = (value) => {
    const normalized = normalizePhoneNumber(value);
    if (normalized) {
        return normalized;
    }

    const digits = String(value || '').replace(/\D/g, '');
    if (digits.length >= 10) {
        return digits.slice(-10);
    }

    return '';
};

const buildKazpostRequestState = (requestRow, orderRow) => {
    const now = Date.now();
    const deadlineTs = requestRow?.deadlineAt ? new Date(requestRow.deadlineAt).getTime() : NaN;
    const hasDeadlinePassed = Number.isFinite(deadlineTs) ? deadlineTs <= now : false;
    const trackingNumber = String(orderRow?.trackingNumber || '').trim();
    const orderId = orderRow?.id || requestRow?.orderId || null;
    const lastError = String(requestRow?.lastError || '').trim();

    if (trackingNumber) {
        return {
            code: 'done',
            label: 'Трек создан',
            needsAttention: false,
            trackingNumber
        };
    }

    if (lastError) {
        return {
            code: 'error',
            label: 'Ошибка',
            needsAttention: true,
            trackingNumber: '',
            errorText: lastError
        };
    }

    if (hasDeadlinePassed) {
        return {
            code: 'timeout',
            label: 'Ошибка: нет трека 10 минут',
            needsAttention: true,
            trackingNumber: '',
            errorText: orderId
                ? 'Прошло больше 10 минут, но трек-номер так и не появился.'
                : 'Прошло больше 10 минут, но заказ по сообщению не был создан.'
        };
    }

    if (orderId) {
        return {
            code: 'waiting_tracking',
            label: 'Ждём трек',
            needsAttention: false,
            trackingNumber: ''
        };
    }

    return {
        code: 'processing',
        label: 'Обрабатывается',
        needsAttention: false,
        trackingNumber: ''
    };
};

const parseStoredJsonArray = (value) => {
    if (!value) {
        return [];
    }

    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
        return [];
    }
};

const buildOrderDraftPaymentStatus = (requestRow, orderRow) => {
    const trackingNumber = String(orderRow?.trackingNumber || '').trim();
    const hasPaidFlag = Boolean(requestRow?.paidAt) || isPaidOrderStatus(orderRow?.status);
    const hasUnknownAliases = parseStoredJsonArray(requestRow?.unknownAliasesJson).length > 0;
    const lastError = String(requestRow?.lastError || '').trim();

    if (lastError) {
        return {
            code: hasUnknownAliases ? 'awaiting_alias_fix' : 'error',
            label: hasUnknownAliases ? 'Ошибка: псевдонимы' : 'Ошибка',
            trackingNumber
        };
    }

    if (!requestRow?.paymentRequestedAt) {
        return {
            code: requestRow?.processingStatus === 'awaiting_alias_fix' ? 'awaiting_alias_fix' : 'processing',
            label: requestRow?.processingStatus === 'awaiting_alias_fix' ? 'Ошибка: псевдонимы' : 'В обработке',
            trackingNumber
        };
    }

    if (hasPaidFlag) {
        return {
            code: 'paid',
            label: 'Оплачено',
            trackingNumber
        };
    }

    return {
        code: 'awaiting_payment',
        label: 'Ожидает оплаты',
        trackingNumber
    };
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
    const rawImageUrls = Array.isArray(body.imageUrls) ? body.imageUrls : parseJsonParam(body.imageUrls, []);
    const imageUrls = Array.isArray(rawImageUrls)
        ? rawImageUrls
              .map((item) => String(item || '').trim())
              .filter(Boolean)
        : [];

    return {
        name: String(body.name || '').trim(),
        alias: body.alias === undefined ? undefined : (body.alias ? String(body.alias).trim() : null),
        description: body.description || '',
        applicationMethodChildren: body.applicationMethodChildren || '',
        applicationMethodAdults: body.applicationMethodAdults || '',
        diseases,
        contraindications: body.contraindications || '',
        videoUrl: body.videoUrl || null,
        imageUrls,
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

    if (period === 'daybeforeyesterday' || period === 'beforeyesterday' || period === 'pozavchera') {
        start.setDate(start.getDate() - 2);
        end.setDate(end.getDate() - 2);
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

    if (period === 'all') {
        return null;
    }

    return null;
};

const getTodayPaidKazpostOrders = async () => {
    const periodRange = getOrderPeriodRange('today');
    if (!periodRange) {
        return [];
    }

    return Order.findAll({
        where: {
            createdAt: {
                [Op.gte]: periodRange.start,
                [Op.lte]: periodRange.end
            },
            status: {
                [Op.in]: PAID_ORDER_STATUSES
            },
            deliveryMethod: 'kazpost'
        },
        order: [['createdAt', 'ASC']]
    });
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
        paymentSellerIin: String(connection.sellerIin || '').trim() || null,
        paymentSellerName: String(connection.sellerAdminName || '').trim() || null
    };
};

const isWebsiteOrder = (order) => {
    const paymentMethod = String(order?.paymentMethod || '')
        .trim()
        .toLowerCase();
    return paymentMethod === 'kaspi' || paymentMethod === 'money';
};

const resolveOrderAccountName = (order, linkToAccountMap, defaultAccountName, siteOrdersToNataliaEnabled = true) => {
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
        return siteOrdersToNataliaEnabled ? defaultAccountName : WITHOUT_LINK_ACCOUNT_NAME;
    }

    if (paymentMethod === 'link') {
        return WITHOUT_LINK_ACCOUNT_NAME;
    }

    return WITHOUT_LINK_ACCOUNT_NAME;
};

const buildIncomeExclusionPeriodsBySellerIin = (activeAdmins) => {
    const periodsBySellerIin = new Map();

    (Array.isArray(activeAdmins) ? activeAdmins : []).forEach((admin) => {
        const sellerIin = normalizeAdminIin(admin?.iin);
        if (!sellerIin) {
            return;
        }

        const periods = parseIncomeExclusionPeriods(admin?.incomeExclusionPeriodsJson);
        if (!periods.length) {
            return;
        }

        periodsBySellerIin.set(sellerIin, periods);
    });

    return periodsBySellerIin;
};

const buildAccountingContext = async () => {
    const activeAdmins = await getActiveAdmins();
    const nataliaAdmin = activeAdmins.find((item) => String(item.fullName || '').trim().toLowerCase() === 'наталья');
    const ivanAdmin = activeAdmins.find((item) => isIvanPhone(item.phoneNumber));
    const defaultAccountName = nataliaAdmin ? nataliaAdmin.fullName : 'Наталья';
    const siteOrdersToNataliaEnabled =
        ivanAdmin && typeof ivanAdmin.siteOrdersToNataliaEnabled === 'boolean'
            ? Boolean(ivanAdmin.siteOrdersToNataliaEnabled)
            : true;
    const paymentLinks = await PaymentLink.findAll({
        attributes: ['url', 'adminName']
    });
    const linkToAccountMap = new Map(
        paymentLinks.map((item) => [normalizePaymentLink(item.url), String(item.adminName || '').trim()])
    );

    return {
        activeAdmins,
        defaultAccountName,
        linkToAccountMap,
        siteOrdersToNataliaEnabled,
        incomeExclusionPeriodsBySellerIin: buildIncomeExclusionPeriodsBySellerIin(activeAdmins)
    };
};

const resolveOrderAccountNameByContext = (order, context) => {
    if (!context) {
        return WITHOUT_LINK_ACCOUNT_NAME;
    }

    return resolveOrderAccountName(
        order,
        context.linkToAccountMap,
        context.defaultAccountName,
        context.siteOrdersToNataliaEnabled
    );
};

const isExcludedAccountingAccountName = (accountName, context = null) => {
    const normalizedAccountName = String(accountName || '').trim();
    if (!normalizedAccountName) {
        return false;
    }

    const tokens = normalizedAccountName
        .trim()
        .toLowerCase()
        .split(/[^a-zа-яё0-9]+/i)
        .filter(Boolean);

    return tokens.some((token) => EXCLUDED_ACCOUNT_NAME_TOKENS.has(token));
};

const excludeOrdersByAccountingAccounts = (orders, context) => {
    return (Array.isArray(orders) ? orders : []).filter((order) => {
        if (isWebsiteOrder(order) && !context?.siteOrdersToNataliaEnabled) {
            return false;
        }

        const paymentSellerIin = normalizeAdminIin(order?.paymentSellerIin);
        if (paymentSellerIin) {
            const incomeExclusionPeriods = context?.incomeExclusionPeriodsBySellerIin?.get(paymentSellerIin) || [];
            const incomeTimestamp = toComparableTimestamp(order?.paidAt || order?.receivedAt || order?.createdAt);
            if (isTimestampInIncomeExclusionPeriods(incomeTimestamp, incomeExclusionPeriods)) {
                return false;
            }
        }

        const accountName = resolveOrderAccountNameByContext(order, context);
        return !isExcludedAccountingAccountName(accountName, context);
    });
};

const excludeOrdersWithoutLinkAccount = (orders, context) => {
    return (Array.isArray(orders) ? orders : []).filter(
        (order) => resolveOrderAccountNameByContext(order, context) !== WITHOUT_LINK_ACCOUNT_NAME
    );
};

const excludeExpensesByAccountingAccounts = (expenses, context = null) => {
    return (Array.isArray(expenses) ? expenses : []).filter((expense) => {
        const spentByName = String(expense?.spentByName || '').trim();
        if (!spentByName) {
            return true;
        }
        return !isExcludedAccountingAccountName(spentByName);
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

const buildAccountFinancialSummary = async ({
    orders,
    expenses,
    currentAdminPhone,
    preloadedContext = null,
    includeAllAccounts = false
}) => {
    const context = preloadedContext || (await buildAccountingContext());
    const normalizedCurrentAdminPhone = normalizeAdminPhone(currentAdminPhone);
    const visibleAccountNames = new Set(
        includeAllAccounts || !normalizedCurrentAdminPhone
            ? []
            : context.activeAdmins
                  .filter((item) => canCurrentAdminSeeTargetAdmin(normalizedCurrentAdminPhone, item.phoneNumber))
                  .map((item) => String(item.fullName || '').trim())
                  .filter(Boolean)
    );
    const hiddenAccountNames = new Set(
        includeAllAccounts || !normalizedCurrentAdminPhone
            ? []
            : context.activeAdmins
                  .filter((item) => !canCurrentAdminSeeTargetAdmin(normalizedCurrentAdminPhone, item.phoneNumber))
                  .map((item) => String(item.fullName || '').trim())
                  .filter(Boolean)
    );
    const accountRowsMap = new Map();
    const registerAccount = (rawAccountName) => {
        const normalizedName = String(rawAccountName || '').trim() || WITHOUT_LINK_ACCOUNT_NAME;
        if (isExcludedAccountingAccountName(normalizedName)) {
            return null;
        }
        const accountName =
            !includeAllAccounts && hiddenAccountNames.has(normalizedName) ? WITHOUT_LINK_ACCOUNT_NAME : normalizedName;

        if (!accountRowsMap.has(accountName)) {
            accountRowsMap.set(accountName, {
                accountName,
                income: 0,
                expenses: 0,
                current: 0
            });
        }

        return accountRowsMap.get(accountName);
    };

    context.activeAdmins.forEach((admin) => {
        const adminName = String(admin.fullName || '').trim();
        if (!adminName) {
            return;
        }
        if (isExcludedAccountingAccountName(adminName)) {
            return;
        }

        if (!includeAllAccounts && visibleAccountNames.size && !visibleAccountNames.has(adminName)) {
            return;
        }

        registerAccount(adminName);
    });
    registerAccount(WITHOUT_LINK_ACCOUNT_NAME);

    (Array.isArray(orders) ? orders : []).forEach((order) => {
        const accountName = resolveOrderAccountNameByContext(order, context);
        const target = registerAccount(accountName);
        if (!target) {
            return;
        }
        target.income += safeAmount(order.totalPrice);
    });

    (Array.isArray(expenses) ? expenses : []).forEach((expense) => {
        const spentByName = String(expense?.spentByName || '').trim();
        if (spentByName && isExcludedAccountingAccountName(spentByName)) {
            return;
        }
        const accountName =
            spentByName && (includeAllAccounts || !hiddenAccountNames.has(spentByName)) ? spentByName : WITHOUT_LINK_ACCOUNT_NAME;
        const target = registerAccount(accountName);
        if (!target) {
            return;
        }
        target.expenses += safeAmount(expense.amount);
    });

    const byAccount = [...accountRowsMap.values()]
        .map((item) => ({
            ...item,
            current: safeAmount(item.income) - safeAmount(item.expenses)
        }))
        .sort((a, b) => b.current - a.current);

    return {
        totalIncome: byAccount.reduce((sum, item) => sum + safeAmount(item.income), 0),
        totalExpenses: byAccount.reduce((sum, item) => sum + safeAmount(item.expenses), 0),
        totalCurrent: byAccount.reduce((sum, item) => sum + safeAmount(item.current), 0),
        byAccount
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

const buildAccountingSummaryData = async ({ period, currentAdminPhone, includeAllAccounts = false }) => {
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
    const linkedPaidOrders = excludeOrdersWithoutLinkAccount(filteredPaidOrders, accountingContext);
    const filteredExpenses = excludeExpensesByAccountingAccounts(expenses, accountingContext);
    const allocation = await buildAccountingAllocation(linkedPaidOrders, currentAdminPhone, accountingContext);
    const accountFinancials = await buildAccountFinancialSummary({
        orders: linkedPaidOrders,
        expenses: filteredExpenses,
        currentAdminPhone,
        preloadedContext: accountingContext,
        includeAllAccounts
    });

    return {
        ordersTotal: linkedPaidOrders.reduce((sum, order) => sum + safeAmount(order.totalPrice), 0),
        expensesTotal: filteredExpenses.reduce((sum, item) => sum + safeAmount(item.amount), 0),
        balance: linkedPaidOrders.reduce((sum, order) => sum + safeAmount(order.totalPrice), 0) -
            filteredExpenses.reduce((sum, item) => sum + safeAmount(item.amount), 0),
        ordersCount: linkedPaidOrders.length,
        expensesCount: filteredExpenses.length,
        allocations: allocation,
        accountFinancials
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
                    alias: payload.alias ?? null,
                    description: payload.description,
                    applicationMethodChildren: payload.applicationMethodChildren,
                    applicationMethodAdults: payload.applicationMethodAdults,
                    diseases: payload.diseases,
                    contraindications: payload.contraindications,
                    videoUrl: payload.videoUrl,
                    imageUrls: payload.imageUrls
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

            const updateFields = {
                name: payload.name,
                description: payload.description,
                applicationMethodChildren: payload.applicationMethodChildren,
                applicationMethodAdults: payload.applicationMethodAdults,
                diseases: payload.diseases,
                contraindications: payload.contraindications,
                videoUrl: payload.videoUrl,
                imageUrls: payload.imageUrls
            };
            if (payload.alias !== undefined) {
                updateFields.alias = payload.alias;
            }
            await product.update(updateFields, { transaction });

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

    async uploadProductImages(req, res) {
        try {
            const files = Array.isArray(req.files) ? req.files : [];
            if (files.length === 0) {
                return res.status(400).json({ message: 'Выберите хотя бы одно изображение' });
            }

            const imageUrls = await Promise.all(files.map((file) => storeProductImage(file)));
            return res.status(201).json({ data: { imageUrls } });
        } catch (error) {
            return res.status(500).json({ message: 'Не удалось загрузить изображения', error: error.message });
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

    async testWhatsAppTemplate(req, res) {
        try {
            const phoneNumber = String(req.body?.phoneNumber || '').trim();
            const messageType = String(req.body?.messageType || '').trim();
            const defaultTrackingNumber = 'AP238974283KZ';
            const defaultAuthCode = '123456';
            const sampleTotalPrice = 15900;
            const sampleStatus = 'Отправлено';
            const samplePaymentLink = 'https://pay.example.com/test';

            const siteOrderDetailsMessage = `
Имя и Фамилия: *Тест Клиент*
Номер телефона: *77073670497*
Номер телефона Kaspi: *77073670497*
Город: *Алматы*
Адрес: *Абая, 10*
Почтовый индекс: *050000*
Метод доставки: *Казпочта*
Метод оплаты: *Kaspi*
Итоговая сумма: *${sampleTotalPrice}* тенге

*Товары*:

Название: Тестовый товар
Тип: Настойка
Количество: 1
`;
            const adminOrderDetailsMessage = `
Имя и Фамилия: *Тест Клиент*
Номер телефона: *77073670497*
Номер телефона Kaspi: *77073670497*
Город: *Алматы*
Адрес: *Абая, 10*
Почтовый индекс: *050000*
Метод доставки: *Казпочта*
Метод оплаты: *link*
Итоговая сумма: *${sampleTotalPrice}* тенге

*Товары*:

Название: Тестовый товар
Тип: Настойка
Количество: 1
`;

            if (!phoneNumber) {
                return res.status(400).json({ message: 'Укажите номер телефона получателя' });
            }

            if (!messageType) {
                return res.status(400).json({ message: 'Выберите тип сообщения' });
            }

            let providerResponse = null;
            if (messageType === 'order_created_details_site_text') {
                providerResponse = await sendNotification(phoneNumber, siteOrderDetailsMessage, { enforce24h: false });
            } else if (messageType === 'order_created_details_admin_text') {
                providerResponse = await sendNotification(phoneNumber, adminOrderDetailsMessage, { enforce24h: false });
            } else if (messageType === 'order_created_payment_instruction_text') {
                providerResponse = await sendNotification(
                    phoneNumber,
                    `Ваш заказ создан. Оплатите счет на сумму *${sampleTotalPrice}* тенге в приложении Каспи.`,
                    { enforce24h: false }
                );
            } else if (messageType === 'order_status_changed_text') {
                providerResponse = await sendNotification(
                    phoneNumber,
                    `Статус вашего заказа изменен на: ${sampleStatus}`,
                    { enforce24h: false }
                );
            } else if (messageType === 'incoming_greeting_text') {
                providerResponse = await sendNotification(phoneNumber, INCOMING_MESSAGE_GREETING, { enforce24h: false });
            } else if (messageType === 'admin_expense_added_text') {
                providerResponse = await sendNotification(phoneNumber, 'Расход добавлен: 5000 ₸\nНа что: Тестовая категория', {
                    enforce24h: false
                });
            } else if (messageType === 'order_draft_unknown_aliases_text') {
                providerResponse = await sendNotification(phoneNumber, 'Не найдены псевдонимы: тест1, тест2', { enforce24h: false });
            } else if (messageType === 'order_draft_empty_items_text') {
                providerResponse = await sendNotification(phoneNumber, 'Не удалось собрать заказ: список товаров пуст.', {
                    enforce24h: false
                });
            } else if (messageType === 'order_draft_total_to_pay_text') {
                providerResponse = await sendNotification(phoneNumber, `К оплате ${sampleTotalPrice}`, { enforce24h: false });
            } else if (messageType === 'payment_link_with_footer_text') {
                providerResponse = await sendNotification(phoneNumber, `${samplePaymentLink}\n${PAYMENT_LINK_FOOTER}`, {
                    enforce24h: false
                });
            } else if (messageType === 'order_draft_auto_create_failed_text') {
                providerResponse = await sendNotification(
                    phoneNumber,
                    'Не удалось автоматически создать заказ после оплаты: test error',
                    { enforce24h: false }
                );
            } else if (messageType === 'auth_template') {
                providerResponse = await sendAuthTemplate(phoneNumber, defaultAuthCode);
            } else if (messageType === 'order_tracking_template') {
                providerResponse = await sendOrderTrackingTemplate(phoneNumber, defaultTrackingNumber);
            } else {
                return res.status(400).json({ message: 'Неизвестный тип сообщения' });
            }

            if (!providerResponse) {
                return res.status(502).json({ message: 'Провайдер не вернул успешный ответ' });
            }

            return res.json({
                data: {
                    phoneNumber,
                    messageType,
                    providerResponse
                }
            });
        } catch (error) {
            logError('adminController.testWhatsAppTemplate', error, {
                phoneNumber: req.body?.phoneNumber || null,
                messageType: req.body?.messageType || null
            });
            return res.status(500).json({
                message: 'Не удалось отправить шаблон WhatsApp',
                error: error.message
            });
        }
    },

    async getOrders(req, res) {
        try {
            const { offset, limit } = parsePagination(req.query);
            const [sortField, sortOrder] = parseSort(req.query, 'id', 'DESC');
            const filter = parseJsonParam(req.query.filter, {});
            const paidOnly = filter.paidOnly === true || String(filter.paidOnly || '').toLowerCase() === 'true';
            const excludeIvanDasha = filter.excludeIvanDasha === true || String(filter.excludeIvanDasha || '').toLowerCase() === 'true';
            const excludeWithoutLink = filter.excludeWithoutLink === true || String(filter.excludeWithoutLink || '').toLowerCase() === 'true';
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
            const accountingContext = excludeIvanDasha || excludeWithoutLink ? await buildAccountingContext() : null;
            let filteredMergedRows =
                excludeIvanDasha && accountingContext
                    ? excludeOrdersByAccountingAccounts([...enrichedPaidOrders, ...virtualPaidOrders], accountingContext)
                    : [...enrichedPaidOrders, ...virtualPaidOrders];

            if (excludeWithoutLink && accountingContext) {
                filteredMergedRows = excludeOrdersWithoutLinkAccount(filteredMergedRows, accountingContext);
            }

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

    async getTodayOrderTrackingQueueStatus(_req, res) {
        try {
            return res.json({
                data: orderTrackingQueueService.getQueueStatus()
            });
        } catch (error) {
            return res.status(500).json({
                message: 'Не удалось получить статус очереди треков',
                error: error.message
            });
        }
    },

    async startTodayOrderTrackingQueue(_req, res) {
        try {
            const orders = await getTodayPaidKazpostOrders();
            const status = await orderTrackingQueueService.startTodayQueue(orders);

            return res.json({
                data: status,
                message: orders.length > 0
                    ? `Очередь треков за сегодня запущена. Заказов: ${orders.length}`
                    : 'За сегодня нет оплаченных заказов Казпочты'
            });
        } catch (error) {
            return res.status(error.statusCode || 500).json({
                message: error.message || 'Не удалось запустить очередь треков',
                error: error.message
            });
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

            const paymentLink = String(orderPayload.paymentLink || '').trim();
            const paymentSellerIin = String(orderPayload.paymentSellerIin || '').replace(/\D/g, '');
            const paymentSellerName = String(orderPayload.paymentSellerName || '').trim();
            if (!paymentLink || paymentSellerIin.length !== 12 || !paymentSellerName) {
                return res.status(400).json({
                    message: 'Заказ со способом оплаты "link" нельзя создать без ссылки и администратора'
                });
            }
            orderPayload.paymentLink = paymentLink;
            orderPayload.paymentSellerIin = paymentSellerIin;
            orderPayload.paymentSellerName = paymentSellerName;

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

    async getKazpostRequests(req, res) {
        try {
            const { offset, limit } = parsePagination(req.query);
            const [sortField, sortOrder] = parseSort(req.query, 'createdAt', 'DESC');
            const filter = parseJsonParam(req.query.filter, {});
            const query = String(filter.q || filter.phoneNumber || '').trim();
            const needsAttentionOnly =
                filter.needsAttention === true || String(filter.needsAttention || '').toLowerCase() === 'true';
            const periodRange = filter.period ? getOrderPeriodRange(filter.period) : null;

            const where = {};
            if (query) {
                const normalizedPhone = normalizePhoneToTenDigits(query);
                where[Op.or] = [
                    {
                        customerPhone: {
                            [Op.like]: `%${normalizedPhone || query.replace(/\D/g, '')}%`
                        }
                    },
                    {
                        sourceText: {
                            [Op.like]: `%${query}%`
                        }
                    },
                    {
                        aiJsonText: {
                            [Op.like]: `%${query}%`
                        }
                    }
                ];
            }

            if (periodRange) {
                where.createdAt = {
                    [Op.gte]: periodRange.start,
                    [Op.lte]: periodRange.end
                };
            }

            const { rows, count } = await KazpostRequest.findAndCountAll({
                where,
                order: [[sortField, sortOrder]],
                offset,
                limit
            });

            const orderIds = [...new Set(rows.map((row) => Number(row.orderId)).filter(Number.isInteger))];
            const orders = orderIds.length > 0
                ? await Order.findAll({
                    where: {
                        id: {
                            [Op.in]: orderIds
                        }
                    }
                })
                : [];
            const orderById = new Map(orders.map((order) => [Number(order.id), order]));

            const data = rows
                .map((row) => {
                    const rowJson = row.toJSON();
                    const linkedOrder = rowJson.orderId ? orderById.get(Number(rowJson.orderId)) : null;
                    const orderJson = linkedOrder ? linkedOrder.toJSON() : null;
                    const state = buildKazpostRequestState(rowJson, orderJson);

                    return {
                        ...rowJson,
                        orderId: orderJson?.id || rowJson.orderId || null,
                        trackingNumber: state.trackingNumber || String(orderJson?.trackingNumber || '').trim() || null,
                        orderStatus: orderJson?.status || null,
                        customerName: orderJson?.customerName || null,
                        addressIndex: orderJson?.addressIndex || null,
                        city: orderJson?.city || null,
                        street: orderJson?.street || null,
                        houseNumber: orderJson?.houseNumber || null,
                        stateCode: state.code,
                        stateLabel: state.label,
                        needsAttention: state.needsAttention,
                        errorText: state.errorText || '',
                        deadlineExceeded: state.code === 'timeout'
                    };
                })
                .filter((row) => (needsAttentionOnly ? row.needsAttention : true));

            return res.json({
                data,
                total: needsAttentionOnly ? data.length : count
            });
        } catch (error) {
            return res.status(500).json({ message: 'Не удалось получить список запросов казпочты', error: error.message });
        }
    },

    async getOrderDraftRequests(req, res) {
        try {
            const { offset, limit } = parsePagination(req.query);
            const [sortField, sortOrder] = parseSort(req.query, 'createdAt', 'DESC');
            const filter = parseJsonParam(req.query.filter, {});
            const query = String(filter.q || filter.phoneNumber || '').trim();
            const periodRange = filter.period ? getOrderPeriodRange(filter.period) : null;

            const where = {};
            if (query) {
                const normalizedPhone = normalizePhoneToTenDigits(query);
                where[Op.or] = [
                    {
                        customerPhone: {
                            [Op.like]: `%${normalizedPhone || query.replace(/\D/g, '')}%`
                        }
                    },
                    {
                        sourceText: {
                            [Op.like]: `%${query}%`
                        }
                    },
                    {
                        aiJsonText: {
                            [Op.like]: `%${query}%`
                        }
                    }
                ];
            }

            if (periodRange) {
                where.createdAt = {
                    [Op.gte]: periodRange.start,
                    [Op.lte]: periodRange.end
                };
            }

            const { rows, count } = await OrderDraftRequest.findAndCountAll({
                where,
                order: [[sortField, sortOrder]],
                offset,
                limit
            });

            const orderIds = [...new Set(rows.map((row) => Number(row.orderId)).filter(Number.isInteger))];
            const connectionIds = [...new Set(rows.map((row) => Number(row.paymentConnectionId)).filter(Number.isInteger))];

            const [orders, connections] = await Promise.all([
                orderIds.length > 0
                    ? Order.findAll({
                        where: {
                            id: {
                                [Op.in]: orderIds
                            }
                        }
                    })
                    : Promise.resolve([]),
                connectionIds.length > 0
                    ? SentPaymentLink.findAll({
                        where: {
                            id: {
                                [Op.in]: connectionIds
                            }
                        }
                    })
                    : Promise.resolve([])
            ]);

            const orderById = new Map(orders.map((order) => [Number(order.id), order]));
            const connectionById = new Map(connections.map((row) => [Number(row.id), row]));

            const data = rows.map((row) => {
                const rowJson = row.toJSON();
                const orderJson = rowJson.orderId ? orderById.get(Number(rowJson.orderId))?.toJSON() || null : null;
                const connectionJson = rowJson.paymentConnectionId
                    ? connectionById.get(Number(rowJson.paymentConnectionId))?.toJSON() || null
                    : null;
                const status = buildOrderDraftPaymentStatus(rowJson, orderJson);
                const unknownAliases = parseStoredJsonArray(rowJson.unknownAliasesJson);
                const parsedAliases = parseStoredJsonArray(rowJson.parsedAliasesJson);

                return {
                    ...rowJson,
                    orderId: orderJson?.id || rowJson.orderId || null,
                    trackingNumber: status.trackingNumber || null,
                    orderStatus: orderJson?.status || null,
                    paymentStatusCode: status.code,
                    paymentStatusLabel: status.label,
                    customerName: orderJson?.customerName || null,
                    addressIndex: orderJson?.addressIndex || null,
                    city: orderJson?.city || null,
                    street: orderJson?.street || null,
                    houseNumber: orderJson?.houseNumber || null,
                    unknownAliases,
                    parsedAliases,
                    paidAmount: connectionJson?.paidAmount || null
                };
            });

            return res.json({
                data,
                total: count
            });
        } catch (error) {
            return res.status(500).json({ message: 'Не удалось получить список сообщений "Ваш заказ"', error: error.message });
        }
    },

    async retryKazpostRequest(req, res) {
        try {
            const requestId = Number(req.params.id);
            if (!Number.isInteger(requestId) || requestId <= 0) {
                return res.status(400).json({ message: 'Некорректный id запроса казпочты' });
            }

            const sourceText = String(req.body.sourceText || '').trim();
            if (!sourceText) {
                return res.status(400).json({ message: 'Укажите текст сообщения для повторной обработки' });
            }

            await retryKazpostRequestProcessing({
                requestId,
                sourceText
            });

            const updatedRequest = await KazpostRequest.findByPk(requestId);
            if (!updatedRequest) {
                return res.status(404).json({ message: 'Запрос казпочты не найден' });
            }

            return res.json({
                data: updatedRequest.toJSON()
            });
        } catch (error) {
            return res.status(500).json({
                message: 'Не удалось повторно обработать запрос казпочты',
                error: formatErrorMessage(error),
                errorDetails: buildErrorDetails(error)
            });
        }
    },

    async retryOrderDraftRequest(req, res) {
        try {
            const requestId = Number(req.params.id);
            if (!Number.isInteger(requestId) || requestId <= 0) {
                return res.status(400).json({ message: 'Некорректный id записи "Ваш заказ"' });
            }

            const corrections = Array.isArray(req.body?.corrections) ? req.body.corrections : [];
            const sourceText = String(req.body?.sourceText || '').trim();
            const updatedRequest = await retryOrderDraftRequestProcessing({
                requestId,
                corrections,
                sourceText
            });

            return res.json({
                data: updatedRequest?.toJSON ? updatedRequest.toJSON() : updatedRequest
            });
        } catch (error) {
            return res.status(500).json({ message: 'Не удалось повторно обработать сообщение "Ваш заказ"', error: error.message });
        }
    },

    async deleteOrderDraftRequest(req, res) {
        try {
            const requestId = Number(req.params.id);
            if (!Number.isInteger(requestId) || requestId <= 0) {
                return res.status(400).json({ message: 'Некорректный id записи "Ваш заказ"' });
            }

            const requestRow = await OrderDraftRequest.findByPk(requestId);
            if (!requestRow) {
                return res.status(404).json({ message: 'Запись "Ваш заказ" не найдена' });
            }

            const payload = requestRow.toJSON();
            await requestRow.destroy();

            return res.json({
                data: payload
            });
        } catch (error) {
            return res.status(500).json({ message: 'Не удалось удалить запись "Ваш заказ"', error: error.message });
        }
    },

    async getDashboardAnalytics(req, res) {
        try {
            const ranges = getDashboardRanges(req.query.period);
            const [orders, expenses, products, virtualPaidOrders] = await Promise.all([
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
                Product.findAll({ attributes: ['id', 'name'] }),
                getPaidConnectionsWithoutOrder({
                    start: ranges.maxStart,
                    end: ranges.now
                })
            ]);

            const accountingContext = await buildAccountingContext();
            const orderRows = orders.map((order) => order.toJSON());
            const mergedPaidRows = excludeOrdersByAccountingAccounts([...orderRows, ...virtualPaidOrders], accountingContext);
            const linkedPaidRows = excludeOrdersWithoutLinkAccount(mergedPaidRows, accountingContext);
            const expenseRows = excludeExpensesByAccountingAccounts(expenses.map((expense) => expense.toJSON()), accountingContext);
            const productNameById = new Map(products.map((item) => [item.id, item.name]));
            const { orderSeries, financeSeries } = buildDashboardSeries(linkedPaidRows, expenseRows, ranges);

            const selectedFinance = financeSeries[ranges.selectedPeriod] || [];
            const selectedTurnover = selectedFinance.reduce((sum, point) => sum + safeAmount(point.turnover), 0);
            const selectedExpenses = selectedFinance.reduce((sum, point) => sum + safeAmount(point.expenses), 0);
            const selectedProfit = selectedTurnover - selectedExpenses;
            const selectedRange = ranges[ranges.selectedPeriod];
            const selectedOrders = linkedPaidRows.filter((order) => {
                const createdAt = new Date(order.createdAt);
                return !Number.isNaN(createdAt.getTime()) && withinRange(createdAt, selectedRange);
            });
            const topProducts = buildTopProducts(selectedOrders, productNameById);
            const accountFinancials = await buildAccountFinancialSummary({
                orders: selectedOrders,
                expenses: expenseRows.filter((expense) => {
                    const spentAt = new Date(expense.spentAt);
                    return !Number.isNaN(spentAt.getTime()) && withinRange(spentAt, selectedRange);
                }),
                currentAdminPhone: req.admin?.phoneNumber,
                preloadedContext: accountingContext
            });

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
                    accountFinancials,
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
            const summaryData = await buildAccountingSummaryData({
                period,
                currentAdminPhone: req.admin?.phoneNumber,
                includeAllAccounts: false
            });

            return res.json({
                data: summaryData
            });
        } catch (error) {
            return res.status(500).json({ message: 'Не удалось получить сводку бухгалтерии', error: error.message });
        }
    },

    async getAccountingFullSummary(req, res) {
        try {
            const currentAdminPhone = normalizeAdminPhone(req.admin?.phoneNumber);
            if (!isIvanPhone(currentAdminPhone)) {
                return res.status(403).json({ message: 'Доступ только для администратора Иван' });
            }

            const filter = parseJsonParam(req.query.filter, {});
            const period = req.query.period || filter.period;
            const summaryData = await buildAccountingSummaryData({
                period,
                currentAdminPhone: req.admin?.phoneNumber,
                includeAllAccounts: true
            });

            return res.json({ data: summaryData });
        } catch (error) {
            return res.status(500).json({ message: 'Не удалось получить полную сводку бухгалтерии', error: error.message });
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
                    iin: admin.iin,
                    ...(canCurrentAdminManageIvanSiteOrdersToggle(currentAdminPhone) && isIvanPhone(admin.phoneNumber)
                        ? {
                            siteOrdersToNataliaEnabled: Boolean(admin.siteOrdersToNataliaEnabled)
                        }
                        : {}),
                    ...(isDashaByIin(req.admin?.iin) && isAskhatAdmin(admin)
                        ? {
                            includeInAccounting: Boolean(admin.includeInAccounting)
                        }
                        : {})
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
                data: visibleAdmins.map((admin) => serializeAdminForResponse(admin, req.admin)),
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

                return res.status(200).json({ data: serializeAdminForResponse(existing, req.admin) });
            }

            const created = await AdminUser.create({
                fullName,
                phoneNumber,
                iin,
                isActive: true
            });

            return res.status(201).json({ data: serializeAdminForResponse(created, req.admin) });
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

            const payload = {
                fullName,
                phoneNumber,
                iin
            };

            if (isIvanPhone(adminUser.phoneNumber) && canCurrentAdminManageIvanSiteOrdersToggle(currentAdminPhone)) {
                if (req.body.siteOrdersToNataliaEnabled !== undefined) {
                    payload.siteOrdersToNataliaEnabled = Boolean(req.body.siteOrdersToNataliaEnabled);
                }
            }

            if (isAskhatAdmin(adminUser) && isDashaByIin(req.admin?.iin)) {
                if (req.body.includeInAccounting !== undefined) {
                    const shouldExcludeIncomeNow = Boolean(req.body.includeInAccounting);
                    payload.includeInAccounting = shouldExcludeIncomeNow;
                    payload.incomeExclusionPeriodsJson = stringifyIncomeExclusionPeriods(
                        updateIncomeExclusionPeriods(
                            parseIncomeExclusionPeriods(adminUser.incomeExclusionPeriodsJson),
                            shouldExcludeIncomeNow
                        )
                    );
                }
            }

            await adminUser.update(payload);

            return res.json({ data: serializeAdminForResponse(adminUser, req.admin) });
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
