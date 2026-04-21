const Sequelize = require('sequelize');
const socialDB = require('../../utilities/socialDatabase');

const Article = socialDB.define(
    'article',
    {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        adminUserId: { type: Sequelize.INTEGER, allowNull: false },
        title: { type: Sequelize.STRING, allowNull: false },
        slug: { type: Sequelize.STRING, allowNull: false, unique: true },
        excerpt: { type: Sequelize.STRING(500), allowNull: true },
        coverMediaId: { type: Sequelize.INTEGER, allowNull: true },
        blocks: { type: Sequelize.TEXT, allowNull: true },
        publishedAt: { type: Sequelize.DATE, allowNull: true },
        isDraft: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true }
    },
    {
        tableName: 'articles',
        indexes: [{ fields: ['publishedAt'] }]
    }
);

module.exports = Article;
