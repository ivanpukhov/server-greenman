const Sequelize = require('sequelize');
const orderDB = require('../../utilities/orderDatabase');

const Expense = orderDB.define('expense', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    amount: {
        type: Sequelize.FLOAT,
        allowNull: false,
        validate: {
            isFloat: true,
            min: 0
        }
    },
    category: {
        type: Sequelize.STRING,
        allowNull: false
    },
    description: {
        type: Sequelize.TEXT,
        allowNull: true
    },
    spentByPhone: {
        type: Sequelize.STRING,
        allowNull: false
    },
    spentByName: {
        type: Sequelize.STRING,
        allowNull: false
    },
    spentAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
    }
});

module.exports = Expense;
