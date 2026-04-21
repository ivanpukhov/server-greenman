const Sequelize = require('sequelize');
const socialDB = require('../../utilities/socialDatabase');

const CourseDayReport = socialDB.define(
    'courseDayReport',
    {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        enrollmentId: { type: Sequelize.INTEGER, allowNull: false },
        courseDayId: { type: Sequelize.INTEGER, allowNull: false },
        text: { type: Sequelize.TEXT, allowNull: true }
    },
    {
        tableName: 'course_day_reports',
        indexes: [{ fields: ['enrollmentId'] }, { fields: ['courseDayId'] }]
    }
);

module.exports = CourseDayReport;
