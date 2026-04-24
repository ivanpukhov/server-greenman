const Sequelize = require('sequelize');
const socialDB = require('../../utilities/socialDatabase');

const CourseDayProgress = socialDB.define(
    'courseDayProgress',
    {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        enrollmentId: { type: Sequelize.INTEGER, allowNull: false },
        courseDayId: { type: Sequelize.INTEGER, allowNull: false },
        completedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    },
    {
        tableName: 'course_day_progress',
        indexes: [
            { unique: true, fields: ['enrollmentId', 'courseDayId'] },
            { fields: ['enrollmentId'] }
        ]
    }
);

module.exports = CourseDayProgress;
