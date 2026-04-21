const Sequelize = require('sequelize');
const socialDB = require('../../utilities/socialDatabase');

const StoryView = socialDB.define(
    'storyView',
    {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        storyId: { type: Sequelize.INTEGER, allowNull: false },
        userId: { type: Sequelize.INTEGER, allowNull: true },
        viewedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    },
    {
        tableName: 'story_views',
        indexes: [{ fields: ['storyId', 'userId'] }]
    }
);

module.exports = StoryView;
