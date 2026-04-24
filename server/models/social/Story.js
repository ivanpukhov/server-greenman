const Sequelize = require('sequelize');
const socialDB = require('../../utilities/socialDatabase');

const Story = socialDB.define(
    'story',
    {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        adminUserId: { type: Sequelize.INTEGER, allowNull: false },
        mediaId: { type: Sequelize.INTEGER, allowNull: false },
        categoryTitle: { type: Sequelize.STRING(80), allowNull: false, defaultValue: 'Greenman' },
        categorySlug: { type: Sequelize.STRING(100), allowNull: false, defaultValue: 'greenman' },
        categoryOrder: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        storyOrder: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        caption: { type: Sequelize.STRING(500), allowNull: true },
        durationSec: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 7 },
        publishedAt: { type: Sequelize.DATE, allowNull: true },
        expiresAt: { type: Sequelize.DATE, allowNull: true },
        isDraft: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false }
    },
    {
        tableName: 'stories',
        indexes: [{ fields: ['expiresAt'] }, { fields: ['adminUserId'] }, { fields: ['categorySlug'] }]
    }
);

module.exports = Story;
