const path = require('path');
const Sequelize = require('sequelize');

const socialStoragePath = process.env.SOCIAL_DB_PATH
    ? path.resolve(process.env.SOCIAL_DB_PATH)
    : path.resolve(__dirname, '../database/social.db');

const socialDB = new Sequelize({
    dialect: 'sqlite',
    storage: socialStoragePath,
    logging: false
});

socialDB.authenticate()
    .then(() => console.log('Подключение к базе данных соцсети успешно установлено.'))
    .catch(err => console.error('Ошибка подключения к базе данных соцсети:', err));

module.exports = socialDB;
