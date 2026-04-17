const Sequelize = require('sequelize');
const orderDB = require('../../utilities/orderDatabase');

const CdekWebhookEvent = orderDB.define('cdek_webhook_event', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    uuid: {
        type: Sequelize.STRING,
        allowNull: true
    },
    cdekNumber: {
        type: Sequelize.STRING,
        allowNull: true
    },
    statusCode: {
        type: Sequelize.STRING,
        allowNull: true
    },
    dateTime: {
        type: Sequelize.STRING,
        allowNull: true
    },
    rawPayload: {
        type: Sequelize.TEXT,
        allowNull: true
    },
    processed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    processingError: {
        type: Sequelize.TEXT,
        allowNull: true
    }
}, {
    indexes: [
        { fields: ['uuid'] },
        { fields: ['statusCode', 'dateTime'] }
    ]
});

module.exports = CdekWebhookEvent;
