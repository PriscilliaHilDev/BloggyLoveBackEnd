require('dotenv').config();  // Charger les variables d'environnement
const mongoose = require('mongoose');
const User = require('../models/User');  // Assure-toi que le chemin est correct

// Fonction pour se connecter à MongoDB
const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MongoDB URI is not defined in the .env file");
    process.exit(1);  
  }

   try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI manquant');

    mongoose.set('strictQuery', true);

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000, // évite d’attendre trop longtemps
    });

    console.log('MongoDB connecté ✅');
  } catch (err) {
    console.error('Erreur MongoDB ❌', err.message);
    process.exit(1);
  }
};

// Fonction pour récupérer et afficher les utilisateurs
// const getUsers = async () => {
//   try {
//     const users = await User.find();  // Récupérer tous les utilisateurs
//     console.log("Users:", users);  // Afficher les utilisateurs dans la console
//   } catch (error) {
//     console.error("Error fetching users:", error.message);
//   }
// };

module.exports = connectDB;
