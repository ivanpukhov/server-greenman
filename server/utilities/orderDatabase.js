const Sequelize = require('sequelize');

const orderDB = new Sequelize({
    dialect: 'sqlite',
    storage: './database/order.db'
});

orderDB.authenticate()
    .then(() => console.log('Подключение к базе данных заказов успешно установлено.'))
    .catch(err => console.error('Ошибка подключения к базе данных заказов:', err));

module.exports = orderDB;
