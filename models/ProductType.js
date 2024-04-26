const Sequelize = require('sequelize');
const sequelize = require('../utilities/database');

const ProductType = sequelize.define('productType', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    type: {
        type: Sequelize.STRING,
        allowNull: false
    },
    price: {
        type: Sequelize.FLOAT,
        allowNull: false,
        validate: {
            isFloat: {
                msg: "Цена должна быть числом"
            },
            min: {
                args: [0],
                msg: "Цена не может быть отрицательной"
            }
        }
    },
    productId: {
        type: Sequelize.INTEGER,
        references: {
            model: 'products',
            key: 'id'
        }
    }
});

module.exports = ProductType;
