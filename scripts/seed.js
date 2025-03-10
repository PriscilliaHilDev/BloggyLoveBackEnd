const mongoose = require('mongoose');
const connectDB = require('../config/db'); // Ajustez le chemin si nécessaire
const { faker } = require('@faker-js/faker');
const User = require('../models/User'); // Assurez-vous que le modèle User est bien défini
const Category = require('../models/Category'); // Assurez-vous que le modèle Category est bien défini
const Post = require('../models/Post'); // Assurez-vous que le modèle Post est bien défini

// Fonction pour créer des données factices
async function createFakePosts() {
  try {
    // Connexion à la base de données
    await connectDB();
 
    // Créer un utilisateur fictif avec un mot de passe
    const user = await User.create({
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'password123'  // Ajoute un mot de passe ici
    });

    // Suppression des anciennes données
    await Post.deleteMany({});
    await Category.deleteMany({});

    // Création de catégories factices
    const categories = ['Amour', 'Aventure', 'Science-fiction', 'Horreur', 'Comédie'];
    const categoryDocs = await Category.insertMany(
      categories.map((name) => ({ name }))
    );

    // Génération et insertion de publications factices
    for (let i = 0; i < 10; i++) {
      const randomCategory =
        categoryDocs[Math.floor(Math.random() * categoryDocs.length)];
      const fakePost = new Post({
        title: faker.lorem.sentence(),
        content: faker.lorem.paragraphs(3),
        categoryId: randomCategory._id, // Assure-toi que 'categoryId' est utilisé dans ton schéma
        userId: user._id, // Utilise l'ID de l'utilisateur créé
      });
      await fakePost.save();
    }

    console.log('Données factices insérées avec succès.');
  } catch (error) {
    console.error('Erreur lors de la création des données factices :', error);
  } finally {
    mongoose.connection.close(); // Fermer la connexion mongoose après l'insertion des données
  }
}

// Exécution de la fonction
createFakePosts();
