const Sequelize = require('sequelize');
const socialDB = require('../../utilities/socialDatabase');

const Poll = socialDB.define(
    'poll',
    {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        pollableType: { type: Sequelize.STRING, allowNull: false },
        pollableId: { type: Sequelize.INTEGER, allowNull: false },
        question: { type: Sequelize.STRING, allowNull: false },
        allowMultiple: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        closedAt: { type: Sequelize.DATE, allowNull: true }
    },
    {
        tableName: 'polls',
        indexes: [{ fields: ['pollableType', 'pollableId'] }]
    }
);

module.exports = Poll;
