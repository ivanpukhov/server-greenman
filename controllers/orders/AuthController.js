const bcrypt = require('bcrypt');
const User = require('../../models/orders/User');
const jwtUtility = require('../../utilities/jwtUtility');
const sendNotification = require('../../utilities/notificationService');
const Sequelize = require('sequelize');

const AuthController = {
    // Регистрация или вход пользователя
    async registerOrLogin(req, res) {
        try {
            const { phoneNumber } = req.body;

            let user = await User.findOne({ where: { phoneNumber } });
            let isNewUser = false;

            if (!user) {
                user = await User.create({
                    phoneNumber,
                    isPhoneConfirmed: false
                });
                isNewUser = true;
            }

            const confirmationCode = generateConfirmationCode();
            user.confirmationCode = confirmationCode;
            user.confirmationCodeExpires = new Date(new Date().getTime() + 10 * 60000); // Код действителен 10 минут
            await user.save();

            sendNotification(phoneNumber, `Ваш код подтверждения: ${confirmationCode}`);

            res.status(isNewUser ? 201 : 200).json({
                message: isNewUser ? 'Пользователь создан, отправлен код подтверждения' : 'Отправлен код подтверждения'
            });
        } catch (error) {
            res.status(500).json({ message: 'Ошибка при обработке запроса', error });
        }
    },

    // Подтверждение кода для аутентификации
    async confirmCode(req, res) {
        try {
            const { phoneNumber, confirmationCode } = req.body;
            const user = await User.findOne({ where: { phoneNumber } });

            if (!user || user.confirmationCode !== confirmationCode || new Date() > user.confirmationCodeExpires) {
                return res.status(400).json({ message: 'Неверный или устаревший код подтверждения' });
            }

            user.isPhoneConfirmed = true;
            user.confirmationCode = null;
            user.confirmationCodeExpires = null;
            await user.save();

            const token = jwtUtility.generateToken(user.id);
            res.status(200).json({ token, userId: user.id });
        } catch (error) {
            res.status(500).json({ message: 'Ошибка при подтверждении кода', error });
        }
    },

    // Повторная отправка кода подтверждения
    async resendConfirmationCode(req, res) {
        try {
            const { phoneNumber } = req.body;
            let user = await User.findOne({ where: { phoneNumber } });

            if (!user) {
                // Создание нового пользователя, если он не найден
                user = await User.create({
                    phoneNumber,
                    isPhoneConfirmed: false
                });
            }

            // Генерация и сохранение нового кода подтверждения
            user.confirmationCode = generateConfirmationCode();
            user.confirmationCodeExpires = new Date(new Date().getTime() + 10 * 60000); // Код действителен 10 минут
            await user.save();

            // Отправка кода подтверждения
            sendNotification(phoneNumber, `Ваш код подтверждения: ${user.confirmationCode}`);
            res.status(200).json({ message: 'Код подтверждения повторно отправлен' });
        } catch (error) {
            res.status(500).json({ message: 'Ошибка при отправке кода подтверждения', error });
        }
    },


};

function generateConfirmationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = AuthController;
