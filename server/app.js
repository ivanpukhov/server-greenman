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
const { buildProductTypeCode } = require('./utilities/productTypeCode');

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
    } catch (error) {
        console.error('Ошибка при проверке структуры таблицы productTypes:', error);
    }

    try {
        const types = await ProductType.findAll({
            include: [{ model: Product, attributes: ['name'] }]
        });

        await Promise.all(
            types.map(async (typeItem) => {
                if (typeItem.code) {
                    return;
                }

                const productName = typeItem.product ? typeItem.product.name : 'товар';
                await typeItem.update({ code: buildProductTypeCode(productName, typeItem.type) });
            })
        );
    } catch (error) {
        console.error('Ошибка при заполнении кодов productTypes:', error);
    }
};

sequelize.sync().then(async () => {
    await ensureProductTypeSchema();
    orderDB.sync().then(() => {
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
