const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const wishlistController = require('../controllers/wishlistController');

const router = express.Router();

router.get('/', authMiddleware, wishlistController.list);
router.post('/', authMiddleware, wishlistController.add);
router.post('/merge', authMiddleware, wishlistController.merge);
router.delete('/:productId', authMiddleware, wishlistController.remove);

module.exports = router;
