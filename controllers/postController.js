const Post = require('../models/Post');
const User = require('../models/User');
const Category = require('../models/Category');


exports.getAllPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const posts = await Post.find()
      .populate('userId', 'name email')   
      .populate('categoryId', 'name')     
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .exec();  

    // Vérifie la structure des posts après population
    console.log(posts);  // Cette ligne est cruciale pour voir si la population fonctionne bien

    if (!posts || posts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Aucun post trouvé'
      });
    }

    const totalPosts = await Post.countDocuments();

    res.json({
      success: true,
      data: posts,
      totalPages: Math.ceil(totalPosts / limit),
      currentPage: parseInt(page),
      message: 'Posts récupérés avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des posts:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};


//   try {
//     const { page = 1, limit = 10 } = req.query;

//     const posts = await Post.find()
//       .populate('userId', 'name email')   
//       .populate('categoryId', 'name')     
//       .sort({ createdAt: -1 })
//       .skip((page - 1) * limit)
//       .limit(parseInt(limit))
//       .exec();  

//     // Affiche la structure de posts pour vérifier la population
//     console.log(posts);  

//     if (!posts || posts.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'Aucun post trouvé'
//       });
//     }

//     const totalPosts = await Post.countDocuments();

//     res.json({
//       success: true,
//       data: posts,
//       totalPages: Math.ceil(totalPosts / limit),
//       currentPage: parseInt(page),
//       message: 'Posts récupérés avec succès'
//     });
//   } catch (error) {
//     console.error('Erreur lors de la récupération des posts:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Erreur serveur',
//       error: error.message
//     });
//   }
// };