const express = require('express');
const OrderProfileController = require('../controllers/orders/OrderProfileController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', OrderProfileController.createOrderProfile); // Не защищён
router.get('/user/:userId', authMiddleware, OrderProfileController.getOrderProfiles);
router.put('/:profileId', authMiddleware, OrderProfileController.updateOrderProfile);
router.delete('/:profileId', authMiddleware, OrderProfileController.deleteOrderProfile);
router.get('/findByPhoneNumber/:phoneNumber', OrderProfileController.findOrderByPhoneNumber);

module.exports = router;
