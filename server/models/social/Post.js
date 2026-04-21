const Sequelize = require('sequelize');
const socialDB = require('../../utilities/socialDatabase');

const Post = socialDB.define(
    'post',
    {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        adminUserId: { type: Sequelize.INTEGER, allowNull: false },
        text: { type: Sequelize.TEXT, allowNull: true },
        publishedAt: { type: Sequelize.DATE, allowNull: true },
        isDraft: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true }
    },
    {
        tableName: 'posts',
        indexes: [{ fields: ['publishedAt'] }, { fields: ['adminUserId'] }]
    }
);

module.exports = Post;
