const express = require('express');
const adminAuthController = require('../controllers/adminAuthController');

const router = express.Router();

router.post('/request-code', adminAuthController.requestCode);
router.post('/confirm-code', adminAuthController.confirmCode);

module.exports = router;
