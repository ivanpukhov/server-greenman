const Sequelize = require('sequelize');
const socialDB = require('../../utilities/socialDatabase');

const ReelView = socialDB.define(
    'reelView',
    {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        reelId: { type: Sequelize.INTEGER, allowNull: false },
        userId: { type: Sequelize.INTEGER, allowNull: true },
        viewedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    },
    {
        tableName: 'reel_views',
        indexes: [{ fields: ['reelId', 'userId'], unique: false }]
    }
);

module.exports = ReelView;
