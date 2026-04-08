const Sequelize = require('sequelize');
const orderDB = require('../../utilities/orderDatabase');

const ProcessedWebhookMessage = orderDB.define(
    'processedWebhookMessage',
    {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        provider: {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: '360dialog'
        },
        handler: {
            type: Sequelize.STRING,
            allowNull: false
        },
        providerMessageId: {
            type: Sequelize.STRING,
            allowNull: false
        },
        customerPhone: {
            type: Sequelize.STRING,
            allowNull: true
        },
        customerChatId: {
            type: Sequelize.STRING,
            allowNull: true
        },
        payloadPreview: {
            type: Sequelize.TEXT,
            allowNull: true
        }
    },
    {
        tableName: 'processed_webhook_messages',
        indexes: [
            {
                unique: true,
                fields: ['provider', 'handler', 'providerMessageId']
            },
            {
                fields: ['customerPhone']
            },
            {
                fields: ['customerChatId']
            },
            {
                fields: ['createdAt']
            }
        ]
    }
);

module.exports = ProcessedWebhookMessage;
