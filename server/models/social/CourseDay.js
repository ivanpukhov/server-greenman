const Sequelize = require('sequelize');
const socialDB = require('../../utilities/socialDatabase');

const CourseDay = socialDB.define(
    'courseDay',
    {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        courseId: { type: Sequelize.INTEGER, allowNull: false },
        dayNumber: { type: Sequelize.INTEGER, allowNull: false },
        title: { type: Sequelize.STRING, allowNull: false },
        contentBlocks: { type: Sequelize.TEXT, allowNull: true },
        publishedAt: { type: Sequelize.DATE, allowNull: true },
        isDraft: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true }
    },
    {
        tableName: 'course_days',
        indexes: [{ fields: ['courseId', 'dayNumber'], unique: true }]
    }
);

module.exports = CourseDay;
