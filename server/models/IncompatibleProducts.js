const Sequelize = require('sequelize');
const sequelize = require('../utilities/database');

const IncompatibleProducts = sequelize.define('incompatibleProducts', {
    productId: {
        type: Sequelize.INTEGER,
        references: {
            model: 'products',
            key: 'id'
        }
    },
    incompatibleWith: {
        type: Sequelize.INTEGER,
        references: {
            model: 'products',
            key: 'id'
        }
    }
});

module.exports = IncompatibleProducts;
