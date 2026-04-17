const path = require('path');
const Sequelize = require('sequelize');

const orderStoragePath = process.env.ORDER_DB_PATH
    ? path.resolve(process.env.ORDER_DB_PATH)
    : path.resolve(__dirname, '../database/order.db');

const orderDB = new Sequelize({
    dialect: 'sqlite',
    storage: orderStoragePath
});

orderDB.authenticate()
    .then(() => console.log('Подключение к базе данных заказов успешно установлено.'))
    .catch(err => console.error('Ошибка подключения к базе данных заказов:', err));

module.exports = orderDB;
