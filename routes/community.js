const express = require("express");
const router = express.Router();
const controller = require('../controller/communityController.js');
const imageController = require('../controller/communityImageController.js');
const shareController = require('../controller/communityShareController.js');
const { 
    createPostValidation,
    updatePostValidation,
    getPostsValidation,
    getPostValidation,
    deletePostValidation,
    createCommentValidation,
    updateCommentValidation,
    deleteCommentValidation,
    getCommentsValidation,
    likePostValidation,
    getUserLikedPostsValidation
} = require('../validators/communityValidator.js');
const validate = require('../middleware/validateRequest.js');

// Community Posts Routes
router.route('/posts')
    .post(createPostValidation, validate, controller.createPost)  // Create a new post
    .get(getPostsValidation, validate, controller.getPosts);      // Get all posts with filters

router.route('/posts/:id')
    .get(getPostValidation, validate, controller.getPost)         // Get single post
    .put(updatePostValidation, validate, controller.updatePost)   // Update post
    .delete(deletePostValidation, validate, controller.deletePost); // Delete post

// Community Statistics
router.get('/stats', controller.getCommunityStats);              // Get community statistics

// Comments Routes
router.route('/comments')
    .post(createCommentValidation, validate, controller.createComment); // Create comment

router.route('/comments/:id')
    .put(updateCommentValidation, validate, controller.updateComment)   // Update comment
    .delete(deleteCommentValidation, validate, controller.deleteComment); // Delete comment

router.get('/posts/:postId/comments', getCommentsValidation, validate, controller.getComments); // Get comments for post

// Likes Routes
router.post('/likes', likePostValidation, validate, controller.likePost);     // Like a post
router.delete('/likes', likePostValidation, validate, controller.unlikePost); // Unlike a post

router.get('/users/:userId/liked-posts', getUserLikedPostsValidation, validate, controller.getUserLikedPosts); // Get user's liked posts

// Image Upload Route
router.post('/upload-image', imageController.uploadCommunityImage); // Upload community post image

// Share Routes
router.post('/shares', shareController.sharePost); // Share a post
router.get('/posts/:postId/shares', shareController.getShareCount); // Get share count for a post

module.exports = router;
