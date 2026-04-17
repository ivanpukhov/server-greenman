const Sequelize = require('sequelize');
const orderDB = require('../../utilities/orderDatabase');

const CdekSettings = orderDB.define('cdek_settings', {
    key: { type: Sequelize.STRING(64), primaryKey: true },
    value: { type: Sequelize.TEXT, allowNull: true }
}, { tableName: 'cdek_settings', timestamps: false });

module.exports = CdekSettings;
