const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');
const transporter = require('../config/nodemailer'); // Assure-toi que tu as configuré ton Nodemailer pour Outlook
const mongoose = require('mongoose');


const client = new OAuth2Client(`${process.env.GOOGLE_OAUTH_APP_GUID}.apps.googleusercontent.com`);


// ---------------- UTILS ----------------

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

const sendError = (res, code, message) => res.status(code).json({ message });

const normalizeEmail = (email) => email.trim().toLowerCase();


// ---------------- GOOGLE LOGIN ----------------

const googleLogin = async (req, res) => {
  const { idToken } = req.body;

  try {
      const ticket = await client.verifyIdToken({
          idToken,
          audience: `${process.env.GOOGLE_OAUTH_APP_GUID}.apps.googleusercontent.com`,
      });

      const payload = ticket.getPayload();
      const { email, name, sub: googleId, picture, email_verified } = payload;

      if (!email || !name || !googleId || !email_verified) {
          return sendError(res, 400, 'Données Google incomplètes ou non vérifiées');
      }

      const userEmail = normalizeEmail(email);
      let user = await User.findOne({ email: userEmail });

      if (!user) {
          user = new User({ email: userEmail, name, googleId, picture });
      } else if (!user.googleId) {
          user.googleId = googleId;
          user.picture = picture;
      }

      const tokens = generateTokens(user._id);
      user.refreshToken = tokens.refreshToken;
      await user.save();

      res.status(200).json({
          message: 'Connexion réussie',
          user: { id: user._id.toString(), name: user.name, email: user.email, picture: user.picture },
          tokens,
      });

  } catch (error) {
      console.error('Erreur Google Login:', error);
      sendError(res, 500, 'Erreur serveur');
  }
};

// ---------------- REGISTER ----------------

const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password || password.length < 6) {
      return sendError(res, 400, 'Nom, email et mot de passe (6 caractères min.) requis');
  }

  try {
      const userEmail = normalizeEmail(email);
      const existingUser = await User.findOne({ email: userEmail });

      if (existingUser) return sendError(res, 400, 'Cet email est déjà utilisé');

      const hashedPassword = await bcrypt.hash(password, 12);

      const newUser = new User({
          name,
          email: userEmail,
          password: hashedPassword,
          googleId: null,
          picture: null,
          refreshToken: null,
      });

      const tokens = generateTokens(newUser._id);
      newUser.refreshToken = tokens.refreshToken;
      await newUser.save();

      res.json({
          message: 'Utilisateur créé',
          user: { id: newUser._id.toString(), name: newUser.name, email: newUser.email },
          tokens,
      });

  } catch (error) {
      console.error('Erreur Register:', error);
      sendError(res, 500, 'Erreur serveur');
  }
};

// ---------------- LOGIN ----------------

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
      const userEmail = normalizeEmail(email);
      const user = await User.findOne({ email: userEmail });

      if (!user || !user.password) return sendError(res, 400, 'Identifiants invalides');

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return sendError(res, 400, 'Identifiants invalides');

      const tokens = generateTokens(user._id);
      user.refreshToken = tokens.refreshToken;
      await user.save();

      res.json({
          message: 'Connexion réussie',
          user: { id: user._id.toString(), name: user.name, email: user.email },
          tokens,
      });

  } catch (error) {
      console.error('Erreur Login:', error);
      sendError(res, 500, 'Erreur serveur');
  }
};


// ---------------- REFRESH TOKEN ----------------

const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  try {
      if (!refreshToken) return sendError(res, 400, 'Refresh token manquant');

      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (!user || user.refreshToken !== refreshToken) {
          return sendError(res, 403, 'Refresh token invalide');
      }

      const newAccessToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

      res.json({ accessToken: newAccessToken });

  } catch (error) {
      console.error('Erreur Refresh Token:', error);
      sendError(res, 500, 'Erreur serveur');
  }
};

// ---------------- FORGOT PASSWORD ----------------

const forgotPassword = async (req, res) => {
  try {
      const { email } = req.body;
      if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
          return sendError(res, 400, 'Email invalide');
      }

      const userEmail = normalizeEmail(email);
      const user = await User.findOne({ email: userEmail });

      if (!user) return res.status(200).json({ message: 'Si cet email existe, un lien a été envoyé' });

      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

      user.resetPasswordToken = resetTokenHash;
      user.resetPasswordExpires = Date.now() + 3600000; // 1h
      await user.save();

      const resetLink = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

      await transporter.sendMail({
          from: process.env.MAIL_FROM || 'no-reply@example.com',
          to: user.email,
          subject: 'Réinitialisation de votre mot de passe',
          html: `
              <p>Bonjour ${user.name || 'utilisateur'},</p>
              <p>Voici votre lien pour réinitialiser votre mot de passe :</p>
              <a href="${resetLink}" target="_blank">${resetLink}</a>
              <p>Le lien expire dans 1 heure.</p>
              <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>
          `
      });

      res.status(200).json({ message: 'Si cet email existe, un lien a été envoyé' });

  } catch (error) {
      console.error('Erreur Forgot Password:', error);
      sendError(res, 500, 'Erreur serveur');
  }
};



const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    console.log(token, password)

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
    // Vérifier si l'ID utilisateur est fourni
    if (!userId) {
      return res.status(400).json({ message: 'ID utilisateur manquant' });
    }

    // Vérifier si l'ID est un ObjectId valide
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'ID utilisateur invalide' });
    }

    // Trouver l'utilisateur dans la base de données
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Réinitialiser le refresh token
    user.refreshToken = null;
    await user.save();

    // Répondre avec un message de succès
    res.status(200).json({ message: 'Déconnexion réussie' });
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    res.status(500).json({
      message: 'Erreur serveur',
      error: error.message || 'Une erreur inconnue est survenue',
    });
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
