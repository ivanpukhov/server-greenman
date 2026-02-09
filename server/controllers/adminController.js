const Sequelize = require('sequelize');
const Product = require('../models/Product');
const ProductType = require('../models/ProductType');
const Order = require('../models/orders/Order');
const Expense = require('../models/orders/Expense');
const AdminUser = require('../models/orders/AdminUser');
const { buildProductTypeCode, buildQrCodeUrl } = require('../utilities/productTypeCode');
const PaymentLink = require('../models/orders/PaymentLink');
const { getActiveAdmins, getAdminByPhone, normalizeAdminPhone } = require('../utilities/adminUsers');
const { attachRecentPaymentLinkToOrder, normalizePaymentLink } = require('../utilities/paymentLinkUtils');

const { Op } = Sequelize;
const PAID_ORDER_STATUSES = ['Оплачено', 'Отправлено', 'Доставлено'];
const WITHOUT_LINK_ACCOUNT_NAME = 'Без ссылки';

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

const parseTypes = (typesRaw) => {
    const types = typeof typesRaw === 'string' ? parseJsonParam(typesRaw, []) : (typesRaw || []);

    if (!Array.isArray(types)) {
        return [];
    }

    return types
        .filter((item) => item && item.type)
        .map((item) => ({
            type: String(item.type).trim(),
            price: Number(item.price) || 0,
            stockQuantity: parseStockQuantity(item.stockQuantity)
        }));
};

const serializeType = (typeRecord, productName) => {
    const plainType = typeRecord.toJSON ? typeRecord.toJSON() : typeRecord;
    const code = plainType.code || buildProductTypeCode(productName, plainType.type);

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
            ? plainProduct.types.map((typeItem) => serializeType(typeItem, plainProduct.name))
            : []
    };
};

const createProductTypes = async ({ productId, productName, types, transaction }) => {
    for (const typeItem of types) {
        await ProductType.create(
            {
                type: typeItem.type,
                price: typeItem.price,
                stockQuantity: typeItem.stockQuantity,
                code: buildProductTypeCode(productName, typeItem.type),
                productId
            },
            { transaction }
        );
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
            const code = typeItem.code || buildProductTypeCode(productJson.name, typeItem.type);
            rows.push({
                id: typeItem.id,
                productId: productJson.id,
                productName: productJson.name,
                typeName: typeItem.type,
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

const getPeriodStartDate = (period) => {
    const now = new Date();
    const endDate = new Date(now);
    let startDate = new Date(now);
    let normalizedPeriod = 'month';

    if (period === 'day') {
        normalizedPeriod = 'day';
        startDate.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
        normalizedPeriod = 'week';
        startDate.setDate(startDate.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
    } else {
        normalizedPeriod = 'month';
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
    }

    return { normalizedPeriod, startDate, endDate };
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

const resolveOrderAccountName = (order, linkToAccountMap, defaultAccountName) => {
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

const buildAccountingAllocation = async (orders) => {
    const activeAdmins = await getActiveAdmins();
    const nataliaAdmin = activeAdmins.find((item) => String(item.fullName || '').trim().toLowerCase() === 'наталья');
    const defaultAccountName = nataliaAdmin ? nataliaAdmin.fullName : 'Наталья';

    const paymentLinks = await PaymentLink.findAll({
        attributes: ['url', 'adminName']
    });
    const linkToAccountMap = new Map(
        paymentLinks.map((item) => [normalizePaymentLink(item.url), String(item.adminName || '').trim()])
    );

    const byAccountMap = new Map();
    let withoutLinkTotal = 0;
    let withoutLinkOrdersCount = 0;
    const accountNameByOrderId = {};

    orders.forEach((order) => {
        const accountName = resolveOrderAccountName(order, linkToAccountMap, defaultAccountName);
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
                    productName: payload.name,
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

            await ProductType.destroy({ where: { productId: product.id }, transaction });

            if (payload.types.length > 0) {
                await createProductTypes({
                    productId: product.id,
                    productName: payload.name,
                    types: payload.types,
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

    async getOrders(req, res) {
        try {
            const { offset, limit } = parsePagination(req.query);
            const [sortField, sortOrder] = parseSort(req.query, 'id', 'DESC');
            const filter = parseJsonParam(req.query.filter, {});

            const where = {};

            if (filter.status) {
                where.status = filter.status;
            }

            if (filter.paidOnly === true || String(filter.paidOnly || '').toLowerCase() === 'true') {
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

            if (filter.period) {
                const range = getOrderPeriodRange(filter.period);
                if (range) {
                    where.createdAt = {
                        [Op.gte]: range.start,
                        [Op.lte]: range.end
                    };
                }
            }

            const { rows, count } = await Order.findAndCountAll({
                where,
                order: [[sortField, sortOrder]],
                offset,
                limit
            });

            const enriched = await Promise.all(rows.map((order) => enrichOrderProducts(order)));
            const allocation = await buildAccountingAllocation(rows.map((order) => order.toJSON()));

            const enrichedWithAccounts = enriched.map((order) => ({
                ...order,
                accountName: allocation.accountNameByOrderId[order.id] || WITHOUT_LINK_ACCOUNT_NAME
            }));

            return res.json({ data: enrichedWithAccounts, total: count });
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

            await attachRecentPaymentLinkToOrder(orderPayload, phoneNumber);

            const created = await Order.create(orderPayload);
            const enriched = await enrichOrderProducts(created);

            try {
                await sendMessageToChannel(created);
            } catch (_error) {
                // Не блокируем создание заказа, если уведомление в канал не отправилось.
            }

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

            return res.status(500).json({ message: 'Не удалось создать заказ', error: error.message });
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
            const { normalizedPeriod, startDate, endDate } = getPeriodStartDate(String(req.query.period || 'month').trim().toLowerCase());

            const orders = await Order.findAll({
                where: {
                    createdAt: {
                        [Op.gte]: startDate,
                        [Op.lte]: endDate
                    }
                },
                order: [['createdAt', 'DESC']]
            });

            const products = await Product.findAll({ attributes: ['id', 'name'] });
            const productNameById = new Map(products.map((item) => [item.id, item.name]));
            const analytics = buildOrdersAnalytics(
                orders.map((order) => order.toJSON()),
                productNameById
            );

            return res.json({
                data: {
                    period: normalizedPeriod,
                    from: startDate.toISOString(),
                    to: endDate.toISOString(),
                    revenue: analytics.revenue,
                    ordersCount: analytics.ordersCount,
                    topCity: analytics.topCity,
                    topProduct: analytics.topProduct
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

            const [orders, expenses] = await Promise.all([
                Order.findAll({ where: ordersWhere, order: [['createdAt', 'DESC']] }),
                Expense.findAll({ where: expensesWhere, order: [['spentAt', 'DESC']] })
            ]);

            const ordersTotal = orders.reduce((sum, order) => sum + safeAmount(order.totalPrice), 0);
            const expensesTotal = expenses.reduce((sum, item) => sum + safeAmount(item.amount), 0);
            const balance = ordersTotal - expensesTotal;
            const allocation = await buildAccountingAllocation(orders.map((order) => order.toJSON()));

            return res.json({
                data: {
                    ordersTotal,
                    expensesTotal,
                    balance,
                    ordersCount: orders.length,
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
            return res.json({
                data: admins.map((admin) => ({
                    id: admin.id,
                    phoneNumber: admin.phoneNumber,
                    fullName: admin.fullName
                }))
            });
        } catch (error) {
            return res.status(500).json({ message: 'Не удалось получить список администраторов', error: error.message });
        }
    },

    async getAdmins(req, res) {
        try {
            const admins = await getActiveAdmins();
            return res.json({
                data: admins,
                total: admins.length
            });
        } catch (error) {
            return res.status(500).json({ message: 'Не удалось получить список администраторов', error: error.message });
        }
    },

    async createAdmin(req, res) {
        try {
            const fullName = String(req.body.fullName || '').trim();
            const phoneNumber = normalizeAdminPhone(req.body.phoneNumber);

            if (!fullName) {
                return res.status(400).json({ message: 'Укажите имя администратора' });
            }

            if (!phoneNumber) {
                return res.status(400).json({ message: 'Некорректный номер телефона' });
            }

            const existing = await AdminUser.findOne({
                where: { phoneNumber }
            });

            if (existing) {
                await existing.update({
                    fullName,
                    isActive: true
                });

                return res.status(200).json({ data: existing.toJSON() });
            }

            const created = await AdminUser.create({
                fullName,
                phoneNumber,
                isActive: true
            });

            return res.status(201).json({ data: created.toJSON() });
        } catch (error) {
            return res.status(500).json({ message: 'Не удалось добавить администратора', error: error.message });
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

            return res.json({
                data: links.map((item) => item.toJSON())
            });
        } catch (error) {
            return res.status(500).json({ message: 'Не удалось получить список ссылок', error: error.message });
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
            const code = String(req.body.code || '').trim().toLowerCase();
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
    }
};

module.exports = adminController;
