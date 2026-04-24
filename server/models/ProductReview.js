const Sequelize = require('sequelize');
const sequelize = require('../utilities/database');

const ProductReview = sequelize.define(
    'productReview',
    {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        productId: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        userId: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        rating: {
            type: Sequelize.INTEGER,
            allowNull: false,
            validate: {
                min: 1,
                max: 5
            }
        },
        body: {
            type: Sequelize.TEXT,
            allowNull: true
        }
    },
    {
        tableName: 'productReviews',
        indexes: [
            { unique: true, fields: ['productId', 'userId'] },
            { fields: ['productId', 'createdAt'] }
        ]
    }
);

module.exports = ProductReview;
