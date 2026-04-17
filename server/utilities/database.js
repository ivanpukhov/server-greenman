const path = require('path');
const Sequelize = require('sequelize');

const appStoragePath = process.env.APP_DB_PATH
    ? path.resolve(process.env.APP_DB_PATH)
    : path.resolve(__dirname, '../database/greenman.db');

// Настройка подключения к базе данных
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: appStoragePath
});

// Проверка подключения
sequelize.authenticate()
    .then(() => {
        console.log('Подключение к базе данных успешно установлено.');
    })
    .catch(err => {
        console.error('Не удалось подключиться к базе данных:', err);
    });

module.exports = sequelize;
