const Sequelize = require('sequelize');
const socialDB = require('../../utilities/socialDatabase');

const SocialNotification = socialDB.define(
    'socialNotification',
    {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        userId: { type: Sequelize.INTEGER, allowNull: true },
        adminUserId: { type: Sequelize.INTEGER, allowNull: true },
        type: { type: Sequelize.STRING, allowNull: false },
        payloadJson: { type: Sequelize.TEXT, allowNull: true },
        readAt: { type: Sequelize.DATE, allowNull: true }
    },
    {
        tableName: 'social_notifications',
        indexes: [{ fields: ['userId'] }, { fields: ['adminUserId'] }, { fields: ['readAt'] }]
    }
);

module.exports = SocialNotification;
