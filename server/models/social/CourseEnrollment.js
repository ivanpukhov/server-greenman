const Sequelize = require('sequelize');
const socialDB = require('../../utilities/socialDatabase');

const CourseEnrollment = socialDB.define(
    'courseEnrollment',
    {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        courseId: { type: Sequelize.INTEGER, allowNull: false },
        userId: { type: Sequelize.INTEGER, allowNull: false },
        status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'active' },
        startedAt: { type: Sequelize.DATE, allowNull: true },
        completedAt: { type: Sequelize.DATE, allowNull: true },
        sentPaymentLinkId: { type: Sequelize.INTEGER, allowNull: true }
    },
    {
        tableName: 'course_enrollments',
        indexes: [
            { fields: ['courseId', 'userId'], unique: true },
            { fields: ['sentPaymentLinkId'] }
        ]
    }
);

module.exports = CourseEnrollment;
