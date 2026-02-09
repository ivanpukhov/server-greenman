const Sequelize = require('sequelize');
const orderDB = require('../../utilities/orderDatabase');

const PaymentLink = orderDB.define(
    'paymentLink',
    {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        url: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true
        },
        adminPhone: {
            type: Sequelize.STRING,
            allowNull: false
        },
        adminName: {
            type: Sequelize.STRING,
            allowNull: false
        },
        isActive: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true
        }
    },
    {
        tableName: 'payment_links'
    }
);

module.exports = PaymentLink;
