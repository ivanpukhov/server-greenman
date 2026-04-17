const express = require('express');
const { suggestCities, pickupPoints, calculate, webhook } = require('../controllers/cdekPublicController');

const router = express.Router();

router.get('/cities/suggest', suggestCities);
router.get('/pickup-points', pickupPoints);
router.post('/calculate', calculate);
router.post('/webhook', webhook);

module.exports = router;
