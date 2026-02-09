const Sequelize = require('sequelize');
const orderDB = require('../../utilities/orderDatabase');

const SentPaymentLink = orderDB.define(
    'sentPaymentLink',
    {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        messageId: {
            type: Sequelize.STRING,
            allowNull: true,
            unique: true
        },
        customerPhone: {
            type: Sequelize.STRING,
            allowNull: false
        },
        customerChatId: {
            type: Sequelize.STRING,
            allowNull: false
        },
        paymentLink: {
            type: Sequelize.STRING,
            allowNull: false
        },
        sourceDescription: {
            type: Sequelize.TEXT,
            allowNull: true
        },
        receivedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.NOW
        }
    },
    {
        tableName: 'sent_payment_links',
        indexes: [
            {
                fields: ['customerPhone']
            },
            {
                fields: ['receivedAt']
            }
        ]
    }
);

module.exports = SentPaymentLink;
