const Sequelize = require('sequelize');
const orderDB = require('../../utilities/orderDatabase');

const KazpostRequest = orderDB.define(
    'kazpostRequest',
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
        aiInputText: {
            type: Sequelize.TEXT,
            allowNull: true
        },
        aiResponseText: {
            type: Sequelize.TEXT,
            allowNull: true
        },
        aiJsonText: {
            type: Sequelize.TEXT,
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
        deadlineAt: {
            type: Sequelize.DATE,
            allowNull: true
        },
        aiProcessedAt: {
            type: Sequelize.DATE,
            allowNull: true
        },
        orderLinkedAt: {
            type: Sequelize.DATE,
            allowNull: true
        },
        retryCount: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0
        }
    },
    {
        tableName: 'kazpost_requests',
        indexes: [
            {
                fields: ['customerPhone']
            },
            {
                fields: ['orderId']
            },
            {
                fields: ['createdAt']
            },
            {
                unique: true,
                fields: ['sourceMessageId'],
                where: {
                    sourceMessageId: {
                        [Sequelize.Op.ne]: null
                    }
                }
            }
        ]
    }
);

module.exports = KazpostRequest;
