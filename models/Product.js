const Sequelize = require('sequelize');
const sequelize = require('../utilities/database');
const ProductType = require("./ProductType");

const Product = sequelize.define('product', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
            notEmpty: {
                msg: "Название продукта не может быть пустым"
            },
            len: {
                args: [3, 100],
                msg: "Название должно быть длиной от 3 до 100 символов"
            }
        }
    },
    description: {
        type: Sequelize.TEXT,
        allowNull: true
    },
    applicationMethodChildren: {
        type: Sequelize.TEXT,
        allowNull: true // Или false, если это поле обязательное
    },
    applicationMethodAdults: {
        type: Sequelize.TEXT,
        allowNull: true // Или false, если это поле обязательное
    },
    diseases: {
        type: Sequelize.JSON,
        allowNull: false,
        validate: {
            notEmpty: {
                msg: "Список болезней не может быть пустым"
            }
        }
    },
    contraindications: {
        type: Sequelize.TEXT,
        allowNull: false,
        validate: {
            notEmpty: {
                msg: "Противопоказания не могут быть пустыми"
            }
        }
    },
    videoUrl: {
        type: Sequelize.STRING,
        allowNull: true,
        validate: {
            isUrl: {
                msg: "Некорректный URL видео"
            }
        }
    }
});

Product.hasMany(ProductType, { as: 'types' });
ProductType.belongsTo(Product);

module.exports = Product;
