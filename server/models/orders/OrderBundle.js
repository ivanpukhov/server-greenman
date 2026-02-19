const Sequelize = require('sequelize');
const orderDB = require('../../utilities/orderDatabase');

const OrderBundle = orderDB.define(
    'orderBundle',
    {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        code: {
            type: Sequelize.STRING(32),
            allowNull: false,
            unique: true
        },
        payload: {
            type: Sequelize.TEXT,
            allowNull: false
        }
    },
    {
        tableName: 'order_bundles',
        indexes: [
            {
                unique: true,
                fields: ['code']
            },
            {
                fields: ['createdAt']
            }
        ]
    }
);

module.exports = OrderBundle;
