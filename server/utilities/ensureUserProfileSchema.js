const Sequelize = require('sequelize');
const orderDB = require('./orderDatabase');

let checked = false;

async function ensureUserProfileSchema() {
    if (checked) return;
    const queryInterface = orderDB.getQueryInterface();
    const tableDefinition = await queryInterface.describeTable('users');

    if (!tableDefinition.firstName) {
        await queryInterface.addColumn('users', 'firstName', {
            type: Sequelize.STRING,
            allowNull: true
        });
    }

    if (!tableDefinition.lastName) {
        await queryInterface.addColumn('users', 'lastName', {
            type: Sequelize.STRING,
            allowNull: true
        });
    }

    checked = true;
}

module.exports = ensureUserProfileSchema;
