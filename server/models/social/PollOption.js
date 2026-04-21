const Sequelize = require('sequelize');
const socialDB = require('../../utilities/socialDatabase');

const PollOption = socialDB.define(
    'pollOption',
    {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        pollId: { type: Sequelize.INTEGER, allowNull: false },
        text: { type: Sequelize.STRING, allowNull: false },
        order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 }
    },
    { tableName: 'poll_options', indexes: [{ fields: ['pollId'] }] }
);

module.exports = PollOption;
