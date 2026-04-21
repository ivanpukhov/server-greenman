const Sequelize = require('sequelize');
const socialDB = require('../../utilities/socialDatabase');

const Reaction = socialDB.define(
    'reaction',
    {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        reactableType: { type: Sequelize.STRING, allowNull: false },
        reactableId: { type: Sequelize.INTEGER, allowNull: false },
        userId: { type: Sequelize.INTEGER, allowNull: false },
        type: { type: Sequelize.STRING, allowNull: false, defaultValue: 'like' }
    },
    {
        tableName: 'reactions',
        indexes: [
            {
                unique: true,
                fields: ['reactableType', 'reactableId', 'userId', 'type']
            }
        ]
    }
);

module.exports = Reaction;
