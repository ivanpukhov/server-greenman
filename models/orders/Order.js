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
        allowNull: false
    },
    city: {
        type: Sequelize.STRING,
        allowNull: false
    },
    street: {
        type: Sequelize.STRING,
        allowNull: false
    },
    houseNumber: {
        type: Sequelize.STRING,
        allowNull: false
    },
    phoneNumber: {
        type: Sequelize.STRING(10), // Без +7
        allowNull: false
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
    }
});



module.exports = Order;
