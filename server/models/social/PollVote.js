const Sequelize = require('sequelize');
const socialDB = require('../../utilities/socialDatabase');

const PollVote = socialDB.define(
    'pollVote',
    {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        pollId: { type: Sequelize.INTEGER, allowNull: false },
        pollOptionId: { type: Sequelize.INTEGER, allowNull: false },
        userId: { type: Sequelize.INTEGER, allowNull: false }
    },
    {
        tableName: 'poll_votes',
        indexes: [{ fields: ['pollId', 'userId'] }, { fields: ['pollOptionId'] }]
    }
);

module.exports = PollVote;
