const express = require('express');
const Sequelize = require('sequelize');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');
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
const chatwootWebhookRoutes = require('./routes/chatwootWebhookRoutes');
const Product = require('./models/Product');
const ProductType = require('./models/ProductType');
require('./models/orders/PaymentLink');
require('./models/orders/SentPaymentLink');
require('./models/orders/OrderBundle');
require('./models/orders/KazpostRequest');
require('./models/orders/OrderDraftRequest');
require('./models/orders/ChatwootMessageSync');
const AdminUser = require('./models/orders/AdminUser');
require('./models/orders/PaymentLinkDispatchPlan');
const { buildProductTypeCode } = require('./utilities/productTypeCode');
const { ensureDefaultAdmins, normalizeAdminIin, DEFAULT_ADMIN_IIN } = require('./utilities/adminUsers');
const { logError } = require('./utilities/errorLogger');

dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: false });

const app = express();

app.use(bodyParser.json({
    verify: (req, _res, buf) => {
        req.rawBody = Buffer.from(buf || []).toString('utf8');
    }
}));
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
app.use('/api/chatwoot-webhook', chatwootWebhookRoutes);

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

const ensureKazpostRequestsSchema = async () => {
    const queryInterface = orderDB.getQueryInterface();

    try {
        const tableDefinition = await queryInterface.describeTable('kazpost_requests');

        if (!tableDefinition.sourceMessageId) {
            await queryInterface.addColumn('kazpost_requests', 'sourceMessageId', {
                type: Sequelize.STRING,
                allowNull: true,
                unique: true
            });
        }

        if (!tableDefinition.customerPhone) {
            await queryInterface.addColumn('kazpost_requests', 'customerPhone', {
                type: Sequelize.STRING,
                allowNull: true
            });
        }

        if (!tableDefinition.customerChatId) {
            await queryInterface.addColumn('kazpost_requests', 'customerChatId', {
                type: Sequelize.STRING,
                allowNull: true
            });
        }

        if (!tableDefinition.sourceText) {
            await queryInterface.addColumn('kazpost_requests', 'sourceText', {
                type: Sequelize.TEXT,
                allowNull: false,
                defaultValue: ''
            });
        }

        if (!tableDefinition.aiInputText) {
            await queryInterface.addColumn('kazpost_requests', 'aiInputText', {
                type: Sequelize.TEXT,
                allowNull: true
            });
        }

        if (!tableDefinition.aiResponseText) {
            await queryInterface.addColumn('kazpost_requests', 'aiResponseText', {
                type: Sequelize.TEXT,
                allowNull: true
            });
        }

        if (!tableDefinition.aiJsonText) {
            await queryInterface.addColumn('kazpost_requests', 'aiJsonText', {
                type: Sequelize.TEXT,
                allowNull: true
            });
        }

        if (!tableDefinition.orderId) {
            await queryInterface.addColumn('kazpost_requests', 'orderId', {
                type: Sequelize.INTEGER,
                allowNull: true
            });
        }

        if (!tableDefinition.processingStatus) {
            await queryInterface.addColumn('kazpost_requests', 'processingStatus', {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: 'received'
            });
        }

        if (!tableDefinition.lastError) {
            await queryInterface.addColumn('kazpost_requests', 'lastError', {
                type: Sequelize.TEXT,
                allowNull: true
            });
        }

        if (!tableDefinition.deadlineAt) {
            await queryInterface.addColumn('kazpost_requests', 'deadlineAt', {
                type: Sequelize.DATE,
                allowNull: true
            });
        }

        if (!tableDefinition.aiProcessedAt) {
            await queryInterface.addColumn('kazpost_requests', 'aiProcessedAt', {
                type: Sequelize.DATE,
                allowNull: true
            });
        }

        if (!tableDefinition.orderLinkedAt) {
            await queryInterface.addColumn('kazpost_requests', 'orderLinkedAt', {
                type: Sequelize.DATE,
                allowNull: true
            });
        }

        if (!tableDefinition.retryCount) {
            await queryInterface.addColumn('kazpost_requests', 'retryCount', {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0
            });
        }
    } catch (error) {
        console.error('Ошибка при проверке структуры таблицы kazpost_requests:', error);
    }
};

const ensureOrderDraftRequestsSchema = async () => {
    const queryInterface = orderDB.getQueryInterface();

    try {
        const tableDefinition = await queryInterface.describeTable('order_draft_requests');

        if (!tableDefinition.sourceMessageId) {
            await queryInterface.addColumn('order_draft_requests', 'sourceMessageId', {
                type: Sequelize.STRING,
                allowNull: true,
                unique: true
            });
        }

        if (!tableDefinition.customerPhone) {
            await queryInterface.addColumn('order_draft_requests', 'customerPhone', {
                type: Sequelize.STRING,
                allowNull: true
            });
        }

        if (!tableDefinition.customerChatId) {
            await queryInterface.addColumn('order_draft_requests', 'customerChatId', {
                type: Sequelize.STRING,
                allowNull: true
            });
        }

        if (!tableDefinition.sourceText) {
            await queryInterface.addColumn('order_draft_requests', 'sourceText', {
                type: Sequelize.TEXT,
                allowNull: false,
                defaultValue: ''
            });
        }

        if (!tableDefinition.parsedAliasesJson) {
            await queryInterface.addColumn('order_draft_requests', 'parsedAliasesJson', {
                type: Sequelize.TEXT,
                allowNull: true
            });
        }

        if (!tableDefinition.unknownAliasesJson) {
            await queryInterface.addColumn('order_draft_requests', 'unknownAliasesJson', {
                type: Sequelize.TEXT,
                allowNull: true
            });
        }

        if (!tableDefinition.bundleCode) {
            await queryInterface.addColumn('order_draft_requests', 'bundleCode', {
                type: Sequelize.STRING,
                allowNull: true
            });
        }

        if (!tableDefinition.expectedAmount) {
            await queryInterface.addColumn('order_draft_requests', 'expectedAmount', {
                type: Sequelize.INTEGER,
                allowNull: true
            });
        }

        if (!tableDefinition.paymentConnectionId) {
            await queryInterface.addColumn('order_draft_requests', 'paymentConnectionId', {
                type: Sequelize.INTEGER,
                allowNull: true
            });
        }

        if (!tableDefinition.paymentRequestedAt) {
            await queryInterface.addColumn('order_draft_requests', 'paymentRequestedAt', {
                type: Sequelize.DATE,
                allowNull: true
            });
        }

        if (!tableDefinition.paidAt) {
            await queryInterface.addColumn('order_draft_requests', 'paidAt', {
                type: Sequelize.DATE,
                allowNull: true
            });
        }

        if (!tableDefinition.aiJsonText) {
            await queryInterface.addColumn('order_draft_requests', 'aiJsonText', {
                type: Sequelize.TEXT,
                allowNull: true
            });
        }

        if (!tableDefinition.aliasSuggestionJson) {
            await queryInterface.addColumn('order_draft_requests', 'aliasSuggestionJson', {
                type: Sequelize.TEXT,
                allowNull: true
            });
        }

        if (!tableDefinition.aliasSuggestedText) {
            await queryInterface.addColumn('order_draft_requests', 'aliasSuggestedText', {
                type: Sequelize.TEXT,
                allowNull: true
            });
        }

        if (!tableDefinition.aliasSuggestionMessagesJson) {
            await queryInterface.addColumn('order_draft_requests', 'aliasSuggestionMessagesJson', {
                type: Sequelize.TEXT,
                allowNull: true
            });
        }

        if (!tableDefinition.aliasDecisionStatus) {
            await queryInterface.addColumn('order_draft_requests', 'aliasDecisionStatus', {
                type: Sequelize.STRING,
                allowNull: true
            });
        }

        if (!tableDefinition.aliasDecisionByChatId) {
            await queryInterface.addColumn('order_draft_requests', 'aliasDecisionByChatId', {
                type: Sequelize.STRING,
                allowNull: true
            });
        }

        if (!tableDefinition.aliasDecisionAt) {
            await queryInterface.addColumn('order_draft_requests', 'aliasDecisionAt', {
                type: Sequelize.DATE,
                allowNull: true
            });
        }

        if (!tableDefinition.orderId) {
            await queryInterface.addColumn('order_draft_requests', 'orderId', {
                type: Sequelize.INTEGER,
                allowNull: true
            });
        }

        if (!tableDefinition.processingStatus) {
            await queryInterface.addColumn('order_draft_requests', 'processingStatus', {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: 'received'
            });
        }

        if (!tableDefinition.lastError) {
            await queryInterface.addColumn('order_draft_requests', 'lastError', {
                type: Sequelize.TEXT,
                allowNull: true
            });
        }

        if (!tableDefinition.retryCount) {
            await queryInterface.addColumn('order_draft_requests', 'retryCount', {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0
            });
        }
    } catch (error) {
        console.error('Ошибка при проверке структуры таблицы order_draft_requests:', error);
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

        if (!tableDefinition.siteOrdersToNataliaEnabled) {
            await queryInterface.addColumn('admin_users', 'siteOrdersToNataliaEnabled', {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true
            });
        }

        if (!tableDefinition.whatsappAgreeTemplateEnabled) {
            await queryInterface.addColumn('admin_users', 'whatsappAgreeTemplateEnabled', {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true
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
                const patch = {};
                if (!normalizedIin || normalizedIin !== admin.iin) {
                    patch.iin = normalizedIin || DEFAULT_ADMIN_IIN;
                }
                if (typeof admin.siteOrdersToNataliaEnabled !== 'boolean') {
                    patch.siteOrdersToNataliaEnabled = true;
                }
                if (typeof admin.whatsappAgreeTemplateEnabled !== 'boolean') {
                    patch.whatsappAgreeTemplateEnabled = true;
                }
                if (Object.keys(patch).length > 0) {
                    await admin.update(patch);
                }
            })
        );
    } catch (error) {
        console.error('Ошибка при нормализации ИИН администраторов:', error);
    }
};

const ensureUsersSchema = async () => {
    const queryInterface = orderDB.getQueryInterface();

    try {
        const tableDefinition = await queryInterface.describeTable('users');

        if (!tableDefinition.lastIncomingMessageAt) {
            await queryInterface.addColumn('users', 'lastIncomingMessageAt', {
                type: Sequelize.DATE,
                allowNull: true
            });
        }

        if (!tableDefinition.pendingWhatsAppMessages) {
            await queryInterface.addColumn('users', 'pendingWhatsAppMessages', {
                type: Sequelize.TEXT,
                allowNull: true
            });
        }

        if (!tableDefinition.isWaitingForWhatsappWindowOpen) {
            await queryInterface.addColumn('users', 'isWaitingForWhatsappWindowOpen', {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
            });
        }

        if (!tableDefinition.lastAgreeTemplateSentAt) {
            await queryInterface.addColumn('users', 'lastAgreeTemplateSentAt', {
                type: Sequelize.DATE,
                allowNull: true
            });
        }

        if (!tableDefinition.chatwootContactIdentifier) {
            await queryInterface.addColumn('users', 'chatwootContactIdentifier', {
                type: Sequelize.STRING,
                allowNull: true
            });
        }

        if (!tableDefinition.chatwootConversationId) {
            await queryInterface.addColumn('users', 'chatwootConversationId', {
                type: Sequelize.INTEGER,
                allowNull: true
            });
        }
    } catch (error) {
        console.error('Ошибка при проверке структуры таблицы users:', error);
    }
};

sequelize.sync().then(async () => {
    await ensureProductSchema();
    await ensureProductTypeSchema();
    orderDB.sync().then(async () => {
        await ensureUsersSchema();
        await ensureAdminUsersSchema();
        await ensureDefaultAdmins();
        await ensureOrderSchema();
        await ensureSentPaymentLinksSchema();
        await ensureKazpostRequestsSchema();
        await ensureOrderDraftRequestsSchema();
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
