const Sequelize = require('sequelize');
const socialDB = require('../../utilities/socialDatabase');

const Comment = socialDB.define(
    'comment',
    {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        commentableType: { type: Sequelize.STRING, allowNull: false },
        commentableId: { type: Sequelize.INTEGER, allowNull: false },
        userId: { type: Sequelize.INTEGER, allowNull: true },
        adminUserId: { type: Sequelize.INTEGER, allowNull: true },
        body: { type: Sequelize.TEXT, allowNull: false },
        parentCommentId: { type: Sequelize.INTEGER, allowNull: true },
        editedAt: { type: Sequelize.DATE, allowNull: true },
        isDeleted: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false }
    },
    {
        tableName: 'comments',
        indexes: [
            { fields: ['commentableType', 'commentableId'] },
            { fields: ['parentCommentId'] }
        ]
    }
);

module.exports = Comment;
