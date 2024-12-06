const mongoose = require('mongoose');

// Définition du schéma pour l'utilisateur
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Le nom est requis.'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'L\'adresse e-mail est requise.'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Veuillez fournir une adresse e-mail valide.',
      ],
    },
    password: {
      type: String,
      required: function () {
        return !this.googleId;
      }, // Obligatoire uniquement si pas d'OAuth
      minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères.'],
    },
    googleId: {
      type: String,
      required: false,
      unique: true,
      sparse: true, // Permet des valeurs nulles avec l'unicité
    },
    picture: {
      type: String,
      required: false,
      default: null, // Définit une valeur par défaut
    },
    refreshToken: {
      type: String,
      default: null,
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Ajoute automatiquement createdAt et updatedAt
  }
);

// Masquage des champs sensibles lors de la conversion en JSON
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.refreshToken;
    delete ret.resetPasswordToken;
    delete ret.__v;
    return ret;
  },
});

// Ajout d'index unique explicitement pour MongoDB
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ googleId: 1 }, { unique: true, sparse: true });

// Création du modèle basé sur le schéma
const User = mongoose.model('User', userSchema);

module.exports = User;
