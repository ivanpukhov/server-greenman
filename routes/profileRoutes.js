// routes/profileRoutes.js

const express = require('express');
const OrderProfileController = require('../controllers/orders/OrderProfileController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, OrderProfileController.getUserDetails);

module.exports = router;
