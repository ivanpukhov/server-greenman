const Sequelize = require('sequelize');

// Настройка подключения к базе данных
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database/greenman.db' 
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
