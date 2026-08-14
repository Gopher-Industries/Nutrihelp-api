/**
 * routes/community.js
 *
 * Public reads, authenticated writes.
 *
 *   GET    /api/community/posts                      list feed (paginated)
 *   GET    /api/community/posts/:postId              post detail
 *   POST   /api/community/posts                      create post              [auth]
 *   POST   /api/community/posts/:postId/like         toggle like              [auth]
 *   GET    /api/community/posts/:postId/comments     list comments
 *   POST   /api/community/posts/:postId/comments     create comment           [auth]
 *   GET    /api/community/leaderboard                leaderboard
 */

const express = require('express');
const router = express.Router();

const controller = require('../controller/communityController');
const { authenticateToken } = require('../middleware/authenticateToken');
const {
  createPostValidator,
  createCommentValidator,
  postIdParamValidator,
  feedQueryValidator,
  leaderboardQueryValidator,
} = require('../validators/communityValidator');

// Reads
router.get('/posts', feedQueryValidator, controller.listFeed);
router.get('/posts/:postId', postIdParamValidator, controller.getPost);
router.get('/posts/:postId/comments', postIdParamValidator, controller.listComments);
router.get('/leaderboard', leaderboardQueryValidator, controller.leaderboard);

// Writes (auth required)
router.post('/posts', authenticateToken, createPostValidator, controller.createPost);
router.post('/posts/:postId/like', authenticateToken, postIdParamValidator, controller.toggleLike);
router.post(
  '/posts/:postId/comments',
  authenticateToken,
  createCommentValidator,
  controller.createComment
);

module.exports = router;
