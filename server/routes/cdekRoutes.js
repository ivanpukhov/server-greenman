const express = require('express');
const { suggestCities, calculate, webhook } = require('../controllers/cdekPublicController');

const router = express.Router();

router.get('/cities/suggest', suggestCities);
router.post('/calculate', calculate);
router.post('/webhook', webhook);

module.exports = router;
