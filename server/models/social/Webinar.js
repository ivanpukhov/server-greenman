const Sequelize = require('sequelize');
const socialDB = require('../../utilities/socialDatabase');

const Webinar = socialDB.define(
    'webinar',
    {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        adminUserId: { type: Sequelize.INTEGER, allowNull: false },
        title: { type: Sequelize.STRING, allowNull: false },
        slug: { type: Sequelize.STRING, allowNull: false, unique: true },
        descriptionBlocks: { type: Sequelize.TEXT, allowNull: true },
        videoMediaId: { type: Sequelize.INTEGER, allowNull: true },
        coverMediaId: { type: Sequelize.INTEGER, allowNull: true },
        publishedAt: { type: Sequelize.DATE, allowNull: true },
        isDraft: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true }
    },
    {
        tableName: 'webinars',
        indexes: [{ fields: ['publishedAt'] }]
    }
);

module.exports = Webinar;
