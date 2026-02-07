const Sequelize = require('sequelize');
const Product = require('../models/Product');
const ProductType = require('../models/ProductType');
const Order = require('../models/orders/Order');

const { Op } = Sequelize;

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

const parseTypes = (typesRaw) => {
    const types = typeof typesRaw === 'string' ? parseJsonParam(typesRaw, []) : (typesRaw || []);

    if (!Array.isArray(types)) {
        return [];
    }

    return types
        .filter((item) => item && item.type)
        .map((item) => ({
            type: String(item.type).trim(),
            price: Number(item.price) || 0
        }));
};

const enrichOrderProducts = async (order) => {
    const rawProducts = Array.isArray(order.products) ? order.products : [];

    const enrichedProducts = await Promise.all(
        rawProducts.map(async (item) => {
            const productId = item.productId || null;
            const typeId = item.typeId || null;

            let productName = null;
            let typeName = null;

            if (productId) {
                const product = await Product.findByPk(productId, { attributes: ['id', 'name'] });
                productName = product ? product.name : null;
            }

            if (typeId) {
                const productType = await ProductType.findByPk(typeId, { attributes: ['id', 'type', 'price'] });
                typeName = productType ? productType.type : null;
            }

            return {
                ...item,
                productName,
                typeName
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

            return res.json({ data: rows, total: count });
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

            return res.json({ data: product });
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
                await ProductType.bulkCreate(
                    payload.types.map((typeItem) => ({ ...typeItem, productId: product.id })),
                    { transaction }
                );
            }

            await transaction.commit();

            const created = await Product.findByPk(product.id, {
                include: [{ model: ProductType, as: 'types' }]
            });

            return res.status(201).json({ data: created });
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
                await ProductType.bulkCreate(
                    payload.types.map((typeItem) => ({ ...typeItem, productId: product.id })),
                    { transaction }
                );
            }

            await transaction.commit();

            const updated = await Product.findByPk(product.id, {
                include: [{ model: ProductType, as: 'types' }]
            });

            return res.json({ data: updated });
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

            return res.json({ data: product });
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

            if (filter.phoneNumber) {
                where.phoneNumber = {
                    [Op.like]: `%${String(filter.phoneNumber).replace(/\D/g, '')}%`
                };
            }

            const { rows, count } = await Order.findAndCountAll({
                where,
                order: [[sortField, sortOrder]],
                offset,
                limit
            });

            const enriched = await Promise.all(rows.map((order) => enrichOrderProducts(order)));

            return res.json({ data: enriched, total: count });
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
    }
};

module.exports = adminController;
