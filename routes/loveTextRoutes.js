// routes/loveTextRoutes.js
const express = require('express');
const router = express.Router();
const loveTextController = require('../controllers/loveTextController');

// Route pour obtenir les textes d'amour par catégorie
router.get('/love-texts', loveTextController.getLoveTexts);

module.exports = router;
