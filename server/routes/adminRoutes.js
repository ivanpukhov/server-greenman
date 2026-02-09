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
router.post('/orders', adminController.createOrder);
router.put('/orders/:id', adminController.updateOrder);
router.delete('/orders/:id', adminController.deleteOrder);

router.get('/analytics/dashboard', adminController.getDashboardAnalytics);
router.get('/admins', adminController.getAdmins);
router.post('/admins', adminController.createAdmin);
router.delete('/admins/:id', adminController.deleteAdmin);
router.get('/accounting/summary', adminController.getAccountingSummary);
router.get('/accounting/admins', adminController.getAccountingAdmins);
router.get('/accounting/payment-links', adminController.getAccountingPaymentLinks);
router.post('/accounting/payment-links', adminController.createAccountingPaymentLink);
router.delete('/accounting/payment-links/:id', adminController.deleteAccountingPaymentLink);
router.get('/expenses', adminController.getExpenses);
router.post('/expenses', adminController.createExpense);
router.delete('/expenses/:id', adminController.deleteExpense);

router.get('/inventory/types', adminController.getInventoryTypes);
router.post('/inventory/receive', adminController.receiveInventory);
router.get('/inventory/qr-codes', adminController.getQrCodes);

module.exports = router;
