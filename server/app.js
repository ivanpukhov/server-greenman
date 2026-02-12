const express = require('express');
const Sequelize = require('sequelize');
const cors = require('cors');
const bodyParser = require('body-parser');
const sequelize = require('./utilities/database');
const orderDB = require('./utilities/orderDatabase');

const productRoutes = require('./routes/productRoutes');
const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const orderProfileRoutes = require('./routes/orderProfileRoutes');
const profileRoutes = require('./routes/profileRoutes');
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const adminRoutes = require('./routes/adminRoutes');
const whatsappWebhookRoutes = require('./routes/whatsappWebhookRoutes');
const Product = require('./models/Product');
const ProductType = require('./models/ProductType');
require('./models/orders/PaymentLink');
require('./models/orders/SentPaymentLink');
const AdminUser = require('./models/orders/AdminUser');
require('./models/orders/PaymentLinkDispatchPlan');
const { buildProductTypeCode } = require('./utilities/productTypeCode');
const { ensureDefaultAdmins, normalizeAdminIin, DEFAULT_ADMIN_IIN } = require('./utilities/adminUsers');
const { logError } = require('./utilities/errorLogger');

const app = express();

app.use(bodyParser.json());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static('public'));

app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/order-profiles', orderProfileRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/whatsapp-webhook', whatsappWebhookRoutes);

app.use((error, req, res, next) => {
    logError('express.errorMiddleware', error, {
        method: req.method,
        path: req.originalUrl
    });
    res.status(error.status || 500);
    res.json({
        error: {
            message: error.message
        }
    });
});

const ensureProductTypeSchema = async () => {
    const queryInterface = sequelize.getQueryInterface();

    try {
        const tableDefinition = await queryInterface.describeTable('productTypes');

        if (!tableDefinition.code) {
            await queryInterface.addColumn('productTypes', 'code', {
                type: Sequelize.STRING,
                allowNull: true
            });
        }

        if (!tableDefinition.stockQuantity) {
            await queryInterface.addColumn('productTypes', 'stockQuantity', {
                type: Sequelize.INTEGER,
                allowNull: true,
                defaultValue: null
            });
        }

        if (!tableDefinition.alias) {
            await queryInterface.addColumn('productTypes', 'alias', {
                type: Sequelize.STRING,
                allowNull: true,
                defaultValue: null
            });
        }
    } catch (error) {
        console.error('Ошибка при проверке структуры таблицы productTypes:', error);
    }

    try {
        const types = await ProductType.findAll();

        await Promise.all(
            types.map(async (typeItem) => {
                const expectedCode = buildProductTypeCode(typeItem.productId, typeItem.id);
                if (!expectedCode || typeItem.code === expectedCode) {
                    return;
                }

                await typeItem.update({ code: expectedCode });
            })
        );
    } catch (error) {
        console.error('Ошибка при заполнении кодов productTypes:', error);
    }
};

const ensureProductSchema = async () => {
    const queryInterface = sequelize.getQueryInterface();

    try {
        const tableDefinition = await queryInterface.describeTable('products');

        if (!tableDefinition.alias) {
            await queryInterface.addColumn('products', 'alias', {
                type: Sequelize.STRING,
                allowNull: true,
                defaultValue: null
            });
        }
    } catch (error) {
        console.error('Ошибка при проверке структуры таблицы products:', error);
    }
};

const ensureOrderSchema = async () => {
    const queryInterface = orderDB.getQueryInterface();

    try {
        const tableDefinition = await queryInterface.describeTable('orders');

        if (!tableDefinition.paymentLink) {
            await queryInterface.addColumn('orders', 'paymentLink', {
                type: Sequelize.STRING,
                allowNull: true
            });
        }

        if (!tableDefinition.paymentSellerIin) {
            await queryInterface.addColumn('orders', 'paymentSellerIin', {
                type: Sequelize.STRING(12),
                allowNull: true
            });
        }

        if (!tableDefinition.paymentSellerName) {
            await queryInterface.addColumn('orders', 'paymentSellerName', {
                type: Sequelize.STRING,
                allowNull: true
            });
        }
    } catch (error) {
        console.error('Ошибка при проверке структуры таблицы orders:', error);
    }
};

const ensureSentPaymentLinksSchema = async () => {
    const queryInterface = orderDB.getQueryInterface();

    try {
        const tableDefinition = await queryInterface.describeTable('sent_payment_links');

        if (!tableDefinition.linkedOrderId) {
            await queryInterface.addColumn('sent_payment_links', 'linkedOrderId', {
                type: Sequelize.INTEGER,
                allowNull: true
            });
        }

        if (!tableDefinition.usedAt) {
            await queryInterface.addColumn('sent_payment_links', 'usedAt', {
                type: Sequelize.DATE,
                allowNull: true
            });
        }

        if (!tableDefinition.expectedAmount) {
            await queryInterface.addColumn('sent_payment_links', 'expectedAmount', {
                type: Sequelize.INTEGER,
                allowNull: true
            });
        }

        if (!tableDefinition.paidAmount) {
            await queryInterface.addColumn('sent_payment_links', 'paidAmount', {
                type: Sequelize.INTEGER,
                allowNull: true
            });
        }

        if (!tableDefinition.isPaid) {
            await queryInterface.addColumn('sent_payment_links', 'isPaid', {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
            });
        }

        if (!tableDefinition.paidAt) {
            await queryInterface.addColumn('sent_payment_links', 'paidAt', {
                type: Sequelize.DATE,
                allowNull: true
            });
        }

        if (!tableDefinition.paymentProofUrl) {
            await queryInterface.addColumn('sent_payment_links', 'paymentProofUrl', {
                type: Sequelize.STRING,
                allowNull: true
            });
        }

        if (!tableDefinition.sellerIin) {
            await queryInterface.addColumn('sent_payment_links', 'sellerIin', {
                type: Sequelize.STRING(12),
                allowNull: true
            });
        }

        if (!tableDefinition.sellerAdminPhone) {
            await queryInterface.addColumn('sent_payment_links', 'sellerAdminPhone', {
                type: Sequelize.STRING,
                allowNull: true
            });
        }

        if (!tableDefinition.sellerAdminName) {
            await queryInterface.addColumn('sent_payment_links', 'sellerAdminName', {
                type: Sequelize.STRING,
                allowNull: true
            });
        }
    } catch (error) {
        console.error('Ошибка при проверке структуры таблицы sent_payment_links:', error);
    }
};

const ensureAdminUsersSchema = async () => {
    const queryInterface = orderDB.getQueryInterface();

    try {
        const tableDefinition = await queryInterface.describeTable('admin_users');

        if (!tableDefinition.iin) {
            await queryInterface.addColumn('admin_users', 'iin', {
                type: Sequelize.STRING(12),
                allowNull: false,
                defaultValue: DEFAULT_ADMIN_IIN
            });
        }
    } catch (error) {
        console.error('Ошибка при проверке структуры таблицы admin_users:', error);
    }

    try {
        const admins = await AdminUser.findAll();
        await Promise.all(
            admins.map(async (admin) => {
                const normalizedIin = normalizeAdminIin(admin.iin);
                if (!normalizedIin || normalizedIin !== admin.iin) {
                    await admin.update({ iin: normalizedIin || DEFAULT_ADMIN_IIN });
                }
            })
        );
    } catch (error) {
        console.error('Ошибка при нормализации ИИН администраторов:', error);
    }
};

sequelize.sync().then(async () => {
    await ensureProductSchema();
    await ensureProductTypeSchema();
    orderDB.sync().then(async () => {
        await ensureAdminUsersSchema();
        await ensureDefaultAdmins();
        await ensureOrderSchema();
        await ensureSentPaymentLinksSchema();
        console.log('База данных заказов синхронизирована.');
    }).catch(err => {
        console.error('Ошибка синхронизации базы данных заказов:', err);
    });
    app.listen(3001, '0.0.0.0', () => {
        console.log('Сервер запущен на порту 3000 и доступен по адресу http://0.0.0.0:3001');
    });
}).catch(err => {
    console.error('Ошибка при синхронизации с базой данных:', err);
});
