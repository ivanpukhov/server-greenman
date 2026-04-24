const Sequelize = require('sequelize');
const socialDB = require('../../utilities/socialDatabase');

const Banner = socialDB.define(
    'banner',
    {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        adminUserId: { type: Sequelize.INTEGER, allowNull: false },
        type: {
            type: Sequelize.STRING(24),
            allowNull: false,
            defaultValue: 'text'
        },
        title: { type: Sequelize.STRING(120), allowNull: true },
        text: { type: Sequelize.STRING(500), allowNull: true },
        buttonText: { type: Sequelize.STRING(80), allowNull: true },
        buttonUrl: { type: Sequelize.STRING(500), allowNull: true },
        linkUrl: { type: Sequelize.STRING(500), allowNull: true },
        backgroundColor: { type: Sequelize.STRING(32), allowNull: false, defaultValue: '#05210f' },
        textColor: { type: Sequelize.STRING(32), allowNull: false, defaultValue: '#ffffff' },
        mediaId: { type: Sequelize.INTEGER, allowNull: true },
        order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        publishedAt: { type: Sequelize.DATE, allowNull: true },
        isDraft: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false }
    },
    {
        tableName: 'banners',
        indexes: [
            { fields: ['isDraft', 'publishedAt'] },
            { fields: ['order'] }
        ]
    }
);

module.exports = Banner;
