const express = require('express');
const adminController = require('../controllers/adminController');
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');

const router = express.Router();

router.use(adminAuthMiddleware);

router.get('/products', adminController.getProducts);
router.get('/products/:id', adminController.getProduct);
router.post('/products', adminController.createProduct);
router.put('/products/:id', adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);

router.get('/orders', adminController.getOrders);
router.get('/orders/:id', adminController.getOrder);
router.put('/orders/:id', adminController.updateOrder);
router.delete('/orders/:id', adminController.deleteOrder);

module.exports = router;
