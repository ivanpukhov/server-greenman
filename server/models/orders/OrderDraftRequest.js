const Sequelize = require('sequelize');
const orderDB = require('../../utilities/orderDatabase');

const OrderDraftRequest = orderDB.define(
    'orderDraftRequest',
    {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        sourceMessageId: {
            type: Sequelize.STRING,
            allowNull: true,
            unique: true
        },
        customerPhone: {
            type: Sequelize.STRING,
            allowNull: true
        },
        customerChatId: {
            type: Sequelize.STRING,
            allowNull: true
        },
        sourceText: {
            type: Sequelize.TEXT,
            allowNull: false
        },
        parsedAliasesJson: {
            type: Sequelize.TEXT,
            allowNull: true
        },
        unknownAliasesJson: {
            type: Sequelize.TEXT,
            allowNull: true
        },
        bundleCode: {
            type: Sequelize.STRING,
            allowNull: true
        },
        expectedAmount: {
            type: Sequelize.INTEGER,
            allowNull: true
        },
        paymentConnectionId: {
            type: Sequelize.INTEGER,
            allowNull: true
        },
        paymentRequestedAt: {
            type: Sequelize.DATE,
            allowNull: true
        },
        paidAt: {
            type: Sequelize.DATE,
            allowNull: true
        },
        aiJsonText: {
            type: Sequelize.TEXT,
            allowNull: true
        },
        aliasSuggestionJson: {
            type: Sequelize.TEXT,
            allowNull: true
        },
        aliasSuggestedText: {
            type: Sequelize.TEXT,
            allowNull: true
        },
        aliasSuggestionMessagesJson: {
            type: Sequelize.TEXT,
            allowNull: true
        },
        aliasDecisionStatus: {
            type: Sequelize.STRING,
            allowNull: true
        },
        aliasDecisionByChatId: {
            type: Sequelize.STRING,
            allowNull: true
        },
        aliasDecisionAt: {
            type: Sequelize.DATE,
            allowNull: true
        },
        orderId: {
            type: Sequelize.INTEGER,
            allowNull: true
        },
        processingStatus: {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: 'received'
        },
        lastError: {
            type: Sequelize.TEXT,
            allowNull: true
        },
        retryCount: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0
        }
    },
    {
        tableName: 'order_draft_requests',
        indexes: [
            {
                fields: ['customerPhone']
            },
            {
                fields: ['bundleCode']
            },
            {
                fields: ['orderId']
            },
            {
                fields: ['createdAt']
            }
        ]
    }
);

module.exports = OrderDraftRequest;
