const Sequelize = require('sequelize');
const socialDB = require('../../utilities/socialDatabase');

const Reel = socialDB.define(
    'reel',
    {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        adminUserId: { type: Sequelize.INTEGER, allowNull: false },
        videoMediaId: { type: Sequelize.INTEGER, allowNull: false },
        thumbnailMediaId: { type: Sequelize.INTEGER, allowNull: true },
        description: { type: Sequelize.TEXT, allowNull: true },
        publishedAt: { type: Sequelize.DATE, allowNull: true },
        viewCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        isDraft: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true }
    },
    {
        tableName: 'reels',
        indexes: [{ fields: ['publishedAt'] }]
    }
);

module.exports = Reel;
