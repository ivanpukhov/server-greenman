const Sequelize = require('sequelize');
const orderDB = require('../../utilities/orderDatabase');

const Order = orderDB.define('order', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    userId: {
        type: Sequelize.INTEGER,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    customerName: {
        type: Sequelize.STRING,
        allowNull: false
    },
    addressIndex: {
        type: Sequelize.STRING,
        allowNull: true // Для РФ СДЭК определяет индекс сам
    },
    city: {
        type: Sequelize.STRING,
        allowNull: false
    },
    street: {
        type: Sequelize.STRING,
        allowNull: true
    },
    houseNumber: {
        type: Sequelize.STRING,
        allowNull: true
    },
    phoneNumber: {
        type: Sequelize.STRING, // Для KZ — 10 цифр без +7, для РФ — E.164 (+7XXXXXXXXXX)
        allowNull: false
    },
    email: {
        type: Sequelize.STRING,
        allowNull: true // Обязателен только для РФ (требование СДЭК)
    },
    country: {
        type: Sequelize.STRING(2),
        allowNull: false,
        defaultValue: 'KZ',
        validate: {
            isIn: [['KZ', 'RF']]
        }
    },
    currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'KZT',
        validate: {
            isIn: [['KZT', 'RUB']]
        }
    },
    deliveryMethod: {
        type: Sequelize.STRING,
        allowNull: false
    },
    paymentMethod: {
        type: Sequelize.STRING,
        allowNull: false
    },
    products: {
        type: Sequelize.JSON,
        allowNull: false
    },
    totalPrice: {
        type: Sequelize.FLOAT,
        allowNull: false
    },
    status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'в обработке'
    },
    trackingNumber: {
        type: Sequelize.STRING,
        allowNull: true // Может быть null, если заказ еще не отправлен
    },
    kaspiNumber: {
        type: Sequelize.STRING,
        allowNull: function() {
            return this.paymentMethod !== 'kaspi';
        }
    },
    paymentLink: {
        type: Sequelize.STRING,
        allowNull: true
    },
    paymentSellerIin: {
        type: Sequelize.STRING(12),
        allowNull: true
    },
    paymentSellerName: {
        type: Sequelize.STRING,
        allowNull: true
    },
    cdekUuid: {
        type: Sequelize.STRING,
        allowNull: true
    },
    cdekNumber: {
        type: Sequelize.STRING,
        allowNull: true
    },
    cdekStatus: {
        type: Sequelize.STRING,
        allowNull: true
    },
    cdekTrackingNumber: {
        type: Sequelize.STRING,
        allowNull: true
    },
    cdekIntakeUuid: {
        type: Sequelize.STRING,
        allowNull: true
    },
    cdekCityCode: {
        type: Sequelize.INTEGER,
        allowNull: true
    },
    cdekDeliveryMode: {
        type: Sequelize.STRING,
        allowNull: true,
        validate: {
            isIn: [['door', 'pvz']]
        }
    },
    cdekAddress: {
        type: Sequelize.STRING,
        allowNull: true
    },
    cdekPvzCode: {
        type: Sequelize.STRING,
        allowNull: true
    },
    cdekPvzName: {
        type: Sequelize.STRING,
        allowNull: true
    },
    cdekPvzAddress: {
        type: Sequelize.STRING,
        allowNull: true
    },
    cdekCalcPriceRub: {
        type: Sequelize.INTEGER,
        allowNull: true
    },
    cdekRawResponse: {
        type: Sequelize.TEXT,
        allowNull: true
    }
},
{
    validate: {
        linkPaymentRequiresAdmin() {
            const paymentMethod = String(this.paymentMethod || '').trim().toLowerCase();
            if (paymentMethod !== 'link') {
                return;
            }

            const paymentLink = String(this.paymentLink || '').trim();
            const paymentSellerName = String(this.paymentSellerName || '').trim();
            const paymentSellerIinDigits = String(this.paymentSellerIin || '').replace(/\D/g, '');

            if (!paymentLink) {
                throw new Error('Для заказа со способом оплаты "link" обязательна ссылка на оплату');
            }

            if (paymentSellerIinDigits.length !== 12) {
                throw new Error('Для заказа со способом оплаты "link" обязателен корректный ИИН продавца');
            }

            if (!paymentSellerName) {
                throw new Error('Для заказа со способом оплаты "link" обязательно имя администратора');
            }
        }
    }
});



module.exports = Order;
