const express = require('express');
const AuthController = require('../controllers/orders/AuthController');
const router = express.Router();

// Маршрут для регистрации или входа пользователя
router.post('/register-login', AuthController.registerOrLogin);

// Маршрут для подтверждения кода
router.post('/confirm-code', AuthController.confirmCode);

// Маршрут для повторной отправки кода подтверждения
router.post('/resend-confirmation-code', AuthController.resendConfirmationCode);

// Здесь можно добавить другие маршруты, если они вам нужны

module.exports = router;
