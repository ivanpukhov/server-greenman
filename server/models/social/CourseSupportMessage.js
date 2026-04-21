const Sequelize = require('sequelize');
const socialDB = require('../../utilities/socialDatabase');

const CourseSupportMessage = socialDB.define(
    'courseSupportMessage',
    {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        enrollmentId: { type: Sequelize.INTEGER, allowNull: false },
        senderType: { type: Sequelize.STRING, allowNull: false },
        senderId: { type: Sequelize.INTEGER, allowNull: false },
        text: { type: Sequelize.TEXT, allowNull: true },
        readAt: { type: Sequelize.DATE, allowNull: true }
    },
    {
        tableName: 'course_support_messages',
        indexes: [{ fields: ['enrollmentId'] }]
    }
);

module.exports = CourseSupportMessage;
