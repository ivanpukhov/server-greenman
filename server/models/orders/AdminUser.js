const Sequelize = require('sequelize');
const orderDB = require('../../utilities/orderDatabase');

const AdminUser = orderDB.define(
    'adminUser',
    {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        phoneNumber: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true
        },
        fullName: {
            type: Sequelize.STRING,
            allowNull: false
        },
        isActive: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true
        }
    },
    {
        tableName: 'admin_users'
    }
);

module.exports = AdminUser;
