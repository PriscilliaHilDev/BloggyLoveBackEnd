// Importation des modules nécessaires
const express = require('express');
const { registerUser, loginUser, googleLogin, refreshToken, logoutUser, forgotPassword, resetPassword } = require('../controllers/authController'); // Import des fonctions depuis authController.js
const { getUsers } = require('../controllers/userController'); // Import de la fonction getUsers depuis userController.js

// Création d'un routeur Express
const router = express.Router();

// Route pour enregistrer un utilisateur
// Cette route accepte une requête POST pour enregistrer un nouvel utilisateur
router.post('/register', registerUser);

// Route pour connecter un utilisateur via mot de passe
// Cette route accepte une requête POST pour connecter un utilisateur en utilisant son mot de passe
router.post('/login', loginUser);

// Route pour renouveler un jeton d'accès (refresh token)
// Cette route permet à l'utilisateur de renouveler son jeton d'accès via une requête POST
router.post('/refresh-token', refreshToken);

// Route pour déconnecter un utilisateur
// Cette route permet de déconnecter un utilisateur via une requête POST
router.post('/logout', logoutUser);

// Route pour réinitialiser le mot de passe d'un utilisateur
// Cette route permet de réinitialiser le mot de passe via une requête POST
router.post('/reset-password', resetPassword);

// Route pour demander la réinitialisation du mot de passe
// Cette route permet à l'utilisateur de demander un e-mail pour réinitialiser son mot de passe via une requête POST
router.post('/forgot-password', forgotPassword); 

// Route pour connecter un utilisateur via Google
// Cette route permet de connecter un utilisateur via une authentification Google via une requête POST
router.post('/google-login', googleLogin);  

// Route de test pour vérifier si le serveur fonctionne correctement
// Cette route permet de tester que le serveur est bien en marche
router.get('/test', (req, res) => {
    res.send('test reussi');
});

// Route pour récupérer tous les utilisateurs
// Cette route permet de récupérer la liste de tous les utilisateurs via une requête GET
router.get('/users', getUsers);

// Exportation du routeur pour l'utiliser dans le fichier principal
module.exports = router;
