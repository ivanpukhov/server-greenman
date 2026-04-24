const Sequelize = require('sequelize');
const socialDB = require('../../utilities/socialDatabase');

const Repost = socialDB.define(
    'repost',
    {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        userId: { type: Sequelize.INTEGER, allowNull: false },
        repostableType: { type: Sequelize.STRING, allowNull: false },
        repostableId: { type: Sequelize.INTEGER, allowNull: false }
    },
    {
        tableName: 'reposts',
        indexes: [
            { unique: true, fields: ['userId', 'repostableType', 'repostableId'] },
            { fields: ['repostableType', 'repostableId'] },
            { fields: ['userId', 'createdAt'] }
        ]
    }
);

module.exports = Repost;
