// controllers/loveTextController.js
const fs = require('fs');

// Charger le fichier JSON contenant les textes d'amour
const loveTexts = JSON.parse(fs.readFileSync('data/loveTexts.json'));

// Contrôleur pour obtenir les textes d'amour par catégorie
exports.getLoveTexts = (req, res) => {
    res.json({ success: true, data: loveTexts });
  };