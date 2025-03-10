const mongoose = require('mongoose');

// Définition du schéma pour les publications
const postSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, "L'identifiant de l'utilisateur est requis."],
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'La catégorie est requise.'],
    },
    title: {
      type: String,
      required: [true, 'Le titre est requis.'],
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Le contenu est requis.'],
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Ajoute automatiquement createdAt et updatedAt
  }
);

// Création du modèle basé sur le schéma
const Post = mongoose.model('Post', postSchema);

module.exports = Post;
