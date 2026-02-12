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
        expectedAmount: {
            type: Sequelize.INTEGER,
            allowNull: true
        },
        paidAmount: {
            type: Sequelize.INTEGER,
            allowNull: true
        },
        isPaid: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        paidAt: {
            type: Sequelize.DATE,
            allowNull: true
        },
        paymentProofUrl: {
            type: Sequelize.STRING,
            allowNull: true
        },
        sellerIin: {
            type: Sequelize.STRING(12),
            allowNull: true
        },
        sellerAdminPhone: {
            type: Sequelize.STRING,
            allowNull: true
        },
        sellerAdminName: {
            type: Sequelize.STRING,
            allowNull: true
        },
        receivedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.NOW
        },
        linkedOrderId: {
            type: Sequelize.INTEGER,
            allowNull: true
        },
        usedAt: {
            type: Sequelize.DATE,
            allowNull: true
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
