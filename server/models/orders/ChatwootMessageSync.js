const Sequelize = require('sequelize');
const orderDB = require('../../utilities/orderDatabase');

const ChatwootMessageSync = orderDB.define(
    'chatwootMessageSync',
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
        chatwootContactIdentifier: {
            type: Sequelize.STRING,
            allowNull: true
        },
        chatwootConversationId: {
            type: Sequelize.INTEGER,
            allowNull: true
        },
        chatwootMessageId: {
            type: Sequelize.STRING,
            allowNull: true
        }
    },
    {
        tableName: 'chatwoot_message_syncs',
        indexes: [
            {
                unique: true,
                fields: ['provider', 'providerMessageId']
            },
            {
                fields: ['customerPhone']
            },
            {
                fields: ['chatwootConversationId']
            }
        ]
    }
);

module.exports = ChatwootMessageSync;
