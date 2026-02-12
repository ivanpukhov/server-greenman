const express = require('express');
const multer = require('multer');
const adminController = require('../controllers/adminController');
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');

const router = express.Router();
const orderPhotoUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024
    }
});

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
router.post('/orders/:id/send-photo', orderPhotoUpload.single('file'), adminController.sendOrderPhoto);

router.get('/analytics/dashboard', adminController.getDashboardAnalytics);
router.get('/admins', adminController.getAdmins);
router.post('/admins', adminController.createAdmin);
router.put('/admins/:id', adminController.updateAdmin);
router.delete('/admins/:id', adminController.deleteAdmin);
router.get('/accounting/summary', adminController.getAccountingSummary);
router.get('/accounting/admins', adminController.getAccountingAdmins);
router.get('/accounting/payment-links', adminController.getAccountingPaymentLinks);
router.get('/accounting/payment-link-dispatch-plan', adminController.getPaymentLinkDispatchPlan);
router.put('/accounting/payment-link-dispatch-plan', adminController.savePaymentLinkDispatchPlan);
router.get('/accounting/payment-link-connections', adminController.getPaymentLinkConnections);
router.delete('/accounting/payment-link-connections/:id', adminController.deletePaymentLinkConnection);
router.post('/accounting/payment-links', adminController.createAccountingPaymentLink);
router.delete('/accounting/payment-links/:id', adminController.deleteAccountingPaymentLink);
router.get('/expenses', adminController.getExpenses);
router.post('/expenses', adminController.createExpense);
router.delete('/expenses/:id', adminController.deleteExpense);

router.get('/inventory/types', adminController.getInventoryTypes);
router.post('/inventory/receive', adminController.receiveInventory);
router.get('/inventory/qr-codes', adminController.getQrCodes);
router.put('/inventory/types/:id/alias', adminController.updateInventoryTypeAlias);

module.exports = router;
