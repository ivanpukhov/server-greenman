const Sequelize = require('sequelize');
const socialDB = require('../../utilities/socialDatabase');

const Media = socialDB.define(
    'media',
    {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        adminUserId: { type: Sequelize.INTEGER, allowNull: false },
        type: { type: Sequelize.STRING, allowNull: false },
        storageKey: { type: Sequelize.STRING, allowNull: false },
        url: { type: Sequelize.STRING, allowNull: false },
        mimeType: { type: Sequelize.STRING, allowNull: false },
        originalName: { type: Sequelize.STRING, allowNull: true },
        sizeBytes: { type: Sequelize.INTEGER, allowNull: true },
        width: { type: Sequelize.INTEGER, allowNull: true },
        height: { type: Sequelize.INTEGER, allowNull: true },
        durationSec: { type: Sequelize.FLOAT, allowNull: true },
        thumbnailKey: { type: Sequelize.STRING, allowNull: true },
        thumbnailUrl: { type: Sequelize.STRING, allowNull: true }
    },
    { tableName: 'media' }
);

module.exports = Media;
