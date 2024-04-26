const express = require('express');
const orderController = require('../controllers/orders/orderController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const router = express.Router();

router.post('/add', orderController.addOrder); // Не защищён
router.get('/',  orderController.getAllOrders);
router.get('/:id', authMiddleware, orderController.getOrderById);
router.put('/:id', authMiddleware, adminMiddleware, orderController.updateOrder);
router.delete('/:id', authMiddleware, adminMiddleware, orderController.deleteOrder);
router.put('/:id/status', adminMiddleware, orderController.updateOrderStatus);
router.put('/:id/trackingNumber', adminMiddleware, orderController.addTrackingNumber);
router.get('/user/:userId', authMiddleware, orderController.getOrdersByUserId);
router.get('/user-orders', authMiddleware, orderController.getUserOrders);

module.exports = router;
