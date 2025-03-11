const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');

// Route pour récupérer tous les posts
router.get('/posts', postController.getAllPosts);

module.exports = router;
