const Sequelize = require('sequelize');
const orderDB = require('../../utilities/orderDatabase');

const PaymentLinkDispatchPlan = orderDB.define(
    'paymentLinkDispatchPlan',
    {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        chainJson: {
            type: Sequelize.TEXT,
            allowNull: false,
            defaultValue: '[]'
        },
        cursorStepIndex: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        sentInCurrentStep: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        updatedByPhone: {
            type: Sequelize.STRING,
            allowNull: true
        }
    },
    {
        tableName: 'payment_link_dispatch_plan'
    }
);

module.exports = PaymentLinkDispatchPlan;
