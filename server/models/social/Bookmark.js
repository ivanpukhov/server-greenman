const Sequelize = require('sequelize');
const socialDB = require('../../utilities/socialDatabase');

const Bookmark = socialDB.define(
    'bookmark',
    {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        userId: { type: Sequelize.INTEGER, allowNull: false },
        bookmarkableType: { type: Sequelize.STRING, allowNull: false },
        bookmarkableId: { type: Sequelize.INTEGER, allowNull: false }
    },
    {
        tableName: 'bookmarks',
        indexes: [
            { unique: true, fields: ['userId', 'bookmarkableType', 'bookmarkableId'] },
            { fields: ['bookmarkableType', 'bookmarkableId'] },
            { fields: ['userId', 'createdAt'] }
        ]
    }
);

module.exports = Bookmark;
