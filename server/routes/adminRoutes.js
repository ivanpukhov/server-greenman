const express = require('express');
const multer = require('multer');
const adminController = require('../controllers/adminController');
const adminWhatsAppController = require('../controllers/adminWhatsAppController');
const cdekAdminController = require('../controllers/admin/cdekAdminController');
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
router.get('/orders/tracking-queue/today', adminController.getTodayOrderTrackingQueueStatus);
router.post('/orders/tracking-queue/today/start', adminController.startTodayOrderTrackingQueue);
router.get('/orders/:id', adminController.getOrder);
router.post('/orders', adminController.createOrder);
router.put('/orders/:id', adminController.updateOrder);
router.delete('/orders/:id', adminController.deleteOrder);
router.post('/orders/:id/send-photo', orderPhotoUpload.single('file'), adminController.sendOrderPhoto);
router.post('/whatsapp/test-template', adminController.testWhatsAppTemplate);
router.post('/whatsapp/test-message', adminController.testWhatsAppTemplate);
router.get('/whatsapp/connection/status', adminWhatsAppController.getConnectionStatus);
router.get('/whatsapp/connection/qr', adminWhatsAppController.getQr);
router.get('/whatsapp/connection/events', adminWhatsAppController.getWebhookEvents);
router.post('/whatsapp/connection/reboot', adminWhatsAppController.reboot);
router.post('/whatsapp/connection/logout', adminWhatsAppController.logout);
router.post('/whatsapp/connection/webhook', adminWhatsAppController.setWebhook);

router.get('/analytics/dashboard', adminController.getDashboardAnalytics);
router.get('/admins', adminController.getAdmins);
router.post('/admins', adminController.createAdmin);
router.put('/admins/:id', adminController.updateAdmin);
router.delete('/admins/:id', adminController.deleteAdmin);
router.get('/accounting/summary', adminController.getAccountingSummary);
router.get('/accounting/full-summary', adminController.getAccountingFullSummary);
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
router.get('/order-bundles/:code', adminController.getOrderBundle);
router.put('/inventory/types/:id/alias', adminController.updateInventoryTypeAlias);
router.get('/kazpost-requests', adminController.getKazpostRequests);
router.post('/kazpost-requests/:id/retry', adminController.retryKazpostRequest);
router.get('/orders-rf', cdekAdminController.listOrdersRf);
router.get('/orders-rf/:id', cdekAdminController.getOrderRf);
router.put('/orders-rf/:id', cdekAdminController.updateOrderRf);
router.post('/orders-rf/:id/cdek/submit', cdekAdminController.submitToCdek);
router.get('/orders-rf/:id/cdek/refresh', cdekAdminController.refreshFromCdek);
router.get('/orders-rf/:id/cdek/print/barcode.pdf', cdekAdminController.printBarcode);
router.get('/orders-rf/:id/cdek/print/waybill.pdf', cdekAdminController.printWaybill);
router.post('/orders-rf/:id/cdek/intake', cdekAdminController.createIntake);

router.get('/order-draft-requests', adminController.getOrderDraftRequests);
router.post('/order-draft-requests/:id/retry', adminController.retryOrderDraftRequest);
router.delete('/order-draft-requests/:id', adminController.deleteOrderDraftRequest);

module.exports = router;
