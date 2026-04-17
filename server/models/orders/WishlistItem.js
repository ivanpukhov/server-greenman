const Sequelize = require('sequelize');
const orderDB = require('../../utilities/orderDatabase');

const WishlistItem = orderDB.define(
    'wishlistItem',
    {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        userId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'users', key: 'id' },
        },
        productId: {
            type: Sequelize.INTEGER,
            allowNull: false,
        },
    },
    {
        tableName: 'wishlist_items',
        indexes: [
            { unique: true, fields: ['userId', 'productId'] },
            { fields: ['userId'] },
        ],
    },
);

module.exports = WishlistItem;
