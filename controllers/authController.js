const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');
const transporter = require('../config/nodemailer'); // Assure-toi que tu as configuré ton Nodemailer pour Outlook


const client = new OAuth2Client(`${process.env.GOOGLE_OAUTH_APP_GUID}.apps.googleusercontent.com`);

// authentifier l'utilisateur avec google
const googleLogin = async (req, res) => {
  const { idToken } = req.body;

  try {
    // Vérifier l'idToken avec Google
    const ticket = await client.verifyIdToken({
      idToken,
      audience: `${process.env.GOOGLE_OAUTH_APP_GUID}.apps.googleusercontent.com`,
    });

    const payload = ticket.getPayload(); // Informations utilisateur de Google
    console.log('Payload:', payload); // Vérifie le contenu de payload
    const { email, name, sub: googleId, picture } = payload; // Renommé sub en googleId

    // Validation des données
    if (!email || !name || !googleId) {
      return res.status(400).json({ message: 'Données utilisateur manquantes' });
    }

    // Chercher l'utilisateur dans la base de données avec l'email
    let user = await User.findOne({ email });

    if (!user) {
      // Si l'utilisateur n'existe pas, créer un nouveau compte Google
      user = new User({
        email,
        name,
        googleId,
        picture,
      });
      await user.save();
    } else if (!user.googleId) {
      // Si l'utilisateur existe mais n'a pas encore de googleId, on fusionne les comptes
      user.googleId = googleId;
      user.picture = picture; // Mettre à jour la photo si disponible
      await user.save();
    }

    // Génération des tokens
    const accessToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Sauvegarde des tokens dans la base de données
    user.refreshToken = refreshToken;
    await user.save();

    // Réponse
    res.status(200).json({
      message: 'Connexion réussie',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        picture: user.picture,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la vérification du token Google:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// inscription d'un nouvel utilisateur
const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  console.log('Données reçues:', req.body); // Vérifie que les données arrivent correctement

  try {
    // Vérification si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('Utilisateur déjà existant');
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    // Hash du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Génération du refreshToken
    const refreshToken = jwt.sign({ userId: email }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Création du nouvel utilisateur avec les champs nécessaires, incluant le refreshToken
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      googleId: null,  // Valeur par défaut
      picture: null,   // Valeur par défaut
      refreshToken : refreshToken,    // Ajouter directement le refreshToken
      resetPasswordToken: null,  // Valeur par défaut
      resetPasswordExpires: null,  // Valeur par défaut
    });

    // Sauvegarde du nouvel utilisateur dans la base de données
    await newUser.save();
    console.log('Utilisateur enregistré:', newUser);

    // Génération de l'accessToken
    const accessToken = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Réponse avec les tokens et les informations utilisateur
    res.json({
      message: 'Nouvel utilisateur créé',
      tokens: {
        accessToken,
        refreshToken,
      },
      user: {
        name: newUser.name,
        email: newUser.email,
      },
    });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// Fonction pour connecter un utilisateur
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  console.log('Tentative de connexion:', { email });

  try {
      // Recherche l'utilisateur par email
      const user = await User.findOne({ email });
      if (!user) {
          console.log(`Utilisateur non trouvé avec l'email: ${email}`);
          return res.status(400).json({ message: 'Identifiants invalides' });
      }

      console.log('Utilisateur trouvé:', { userId: user._id, email: user.email });

      // Vérification du mot de passe
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
          console.log(`Mot de passe incorrect pour l'utilisateur ${user.email}`);
          return res.status(400).json({ message: 'Identifiants invalides' });
      }

      console.log('Mot de passe validé avec succès');

      // Générer un access token et un refresh token
      const accessToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      const refreshToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

      // Stocker le refresh token dans la base de données 
      user.refreshToken = refreshToken;
      await user.save();

      // Répondre avec les tokens et les informations utilisateur
      res.json({
          message: 'Connexion réussie',
          tokens: {
              accessToken,
              refreshToken,
          },
          user: {
              name: user.name, // Ajouter le nom de l'utilisateur si tu veux l'envoyer
              email: user.email,
          },
      });
  } catch (error) {
      console.error('Erreur serveur lors de la tentative de connexion:', error);
      res.status(500).json({
          message: 'Erreur serveur',
          error: error.message || 'Une erreur inconnue est survenue',
      });
  }
};

const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  try {
    // Vérifier si le refresh token existe
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token manquant' });
    }

    // Vérifier et décoder le refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    // Chercher l'utilisateur à partir de l'id décodé
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Vérifier que le refresh token correspond à celui stocké
    if (user.refreshToken !== refreshToken) {
      return res.status(403).json({ message: 'Refresh token invalide' });
    }

    // Générer un nouveau access token
    const newAccessToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    console.error('Erreur lors du rafraîchissement du token:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// Fonction pour la demande de réinitialisation du mot de passe
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'L\'adresse e-mail est invalide.' });
    }

    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ email: email.trim() });
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    // Générer un token de réinitialisation sécurisé
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Ajouter un délai d'expiration au token (1 heure)
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 heure
    await user.save();

    // Créer un lien de réinitialisation
    const resetLink = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    // Options de l'e-mail
    const mailOptions = {
      from: 'no-reply@example.com',
      to: user.email,
      subject: 'Réinitialisation de votre mot de passe',
      html: `
        <p>Bonjour ${user.name || 'utilisateur'},</p>
        <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
        <p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe :</p>
        <a href="${resetLink}" target="_blank">${resetLink}</a>
        <p>Ce lien est valable pendant 1 heure.</p>
        <p>Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet e-mail.</p>
      `,
    };

    // Envoyer l'e-mail de réinitialisation
    await transporter.sendMail(mailOptions);

    res.status(200).json({
      message: 'Un e-mail de réinitialisation a été envoyé à votre adresse e-mail.',
    });
  } catch (error) {
    console.error('Erreur lors de la demande de réinitialisation:', error);
    res.status(500).json({
      message: 'Une erreur est survenue lors de l\'envoi de l\'e-mail de réinitialisation.',
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: 'Token ou mot de passe manquant.' });
    }

    // Vérifie si le token est valide
    const user = await User.findOne({
      resetPasswordToken: crypto.createHash('sha256').update(token).digest('hex'),
      resetPasswordExpires: { $gt: Date.now() }, // Vérifie si le token n'est pas expiré
    });

    if (!user) {
      return res.status(400).json({ message: 'Token invalide ou expiré.' });
    }

    // Met à jour le mot de passe
    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined; // Supprime le token
    user.resetPasswordExpires = undefined; // Supprime l'expiration
    await user.save();

    res.status(200).json({ message: 'Mot de passe réinitialisé avec succès.' });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe:', error);
    res.status(500).json({ message: 'Erreur lors de la réinitialisation.' });
  }
};

const logoutUser = async (req, res) => {
  const { userId } = req.body; 

  try {
    // Trouver l'utilisateur et révoquer le refresh token
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Réinitialiser le refresh token
    user.refreshToken = null;
    await user.save();

    res.status(200).json({ message: 'Déconnexion réussie' });
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  googleLogin,
  refreshToken,
  logoutUser,
  resetPassword,
  forgotPassword
};
