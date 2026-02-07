const Sequelize = require('sequelize');
const orderDB = require('../../utilities/orderDatabase');

const OrderProfile = orderDB.define('orderProfile', {
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
    name: {
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
    phoneNumber: { // Новое поле для номера телефона
        type: Sequelize.STRING,
        allowNull: false
    },
    kaspiNumber: {
        type: Sequelize.STRING,
        allowNull: function() {
            return this.paymentMethod !== 'kaspi';
        }
    },
});

module.exports = OrderProfile;
