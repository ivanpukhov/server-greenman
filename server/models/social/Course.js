const Sequelize = require('sequelize');
const socialDB = require('../../utilities/socialDatabase');

const Course = socialDB.define(
    'course',
    {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        adminUserId: { type: Sequelize.INTEGER, allowNull: false },
        title: { type: Sequelize.STRING, allowNull: false },
        slug: { type: Sequelize.STRING, allowNull: false, unique: true },
        shortDescription: { type: Sequelize.STRING(1000), allowNull: true },
        descriptionBlocks: { type: Sequelize.TEXT, allowNull: true },
        trailerMediaId: { type: Sequelize.INTEGER, allowNull: true },
        coverMediaId: { type: Sequelize.INTEGER, allowNull: true },
        priceCents: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'KZT' },
        durationDays: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        publishedAt: { type: Sequelize.DATE, allowNull: true },
        isDraft: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true }
    },
    {
        tableName: 'courses',
        indexes: [{ fields: ['publishedAt'] }]
    }
);

module.exports = Course;
