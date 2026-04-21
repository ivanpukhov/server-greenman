const Sequelize = require('sequelize');
const socialDB = require('../../utilities/socialDatabase');

const MediaAttachment = socialDB.define(
    'mediaAttachment',
    {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        mediaId: { type: Sequelize.INTEGER, allowNull: false },
        attachableType: { type: Sequelize.STRING, allowNull: false },
        attachableId: { type: Sequelize.INTEGER, allowNull: false },
        order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 }
    },
    {
        tableName: 'media_attachments',
        indexes: [{ fields: ['attachableType', 'attachableId'] }, { fields: ['mediaId'] }]
    }
);

module.exports = MediaAttachment;
