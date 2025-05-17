const express = require('express');
const router = express.Router();
const communityController = require('../controllers/communityController');
const { isAuthenticated } = require('../middleware/auth');

// Apply authentication middleware to all community routes
router.use(isAuthenticated);

// Community home route
router.get('/', communityController.getCommunityHome);

// Create post routes
router.get('/post/create', communityController.getCreatePost);
router.post('/post/create', communityController.postCreatePost);

// View post route
router.get('/post/:id', communityController.getPost);

// Edit post routes
router.get('/post/:id/edit', communityController.getEditPost);
router.post('/post/:id/edit', communityController.postEditPost);

// Delete post route
router.post('/post/:id/delete', communityController.deletePost);

// Add comment route
router.post('/post/:id/comment', communityController.addComment);

// Delete comment route
router.post('/comment/:id/delete', communityController.deleteComment);

// User posts route
router.get('/user/:id/posts', communityController.getUserPosts);

// Search posts route
router.get('/search', communityController.searchPosts);

module.exports = router;
