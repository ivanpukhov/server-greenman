const express = require('express');
const multer = require('multer');
const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const router = express.Router();

// Настройка Multer для загрузки видео
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/videos/');
    },
    filename: (req, file, cb) => {
        cb(null, new Date().toISOString().replace(/:/g, '-') + '-' + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    // Принимать только видеофайлы
    if (file.mimetype === 'video/mp4' || file.mimetype === 'video/mpeg') {
        cb(null, true);
    } else {
        cb(null, false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter
});

// Маршруты для продуктов
router.post('/add', upload.single('video'), productController.addProduct);
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.put('/:id', authMiddleware, adminMiddleware, upload.single('video'), productController.updateProduct);
router.delete('/:id',  productController.deleteProduct);
router.get('/search/:name', productController.searchProducts);
router.post('/getProductsByIdsAndTypes', productController.getProductsByIdsAndTypes);

module.exports = router;
