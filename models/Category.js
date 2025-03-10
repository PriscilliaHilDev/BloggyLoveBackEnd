const mongoose = require('mongoose');

// Définition du schéma pour les catégories
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Le nom de la catégorie est requis.'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true, // Ajoute automatiquement createdAt et updatedAt
  }
);

// Création du modèle basé sur le schéma
const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
