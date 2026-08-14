/**
 * controller/communityController.js
 *
 * HTTP layer for community endpoints. Uses the standardized support
 * response envelope (utils/supportResponse) so the frontend gets a
 * consistent shape across the support + community surface.
 */

const { validationResult } = require('express-validator');
const support = require('../utils/supportResponse');
const logger = require('../utils/logger');
const community = require('../services/communityService');

function _userFrom(req) {
  return req.user || {};
}

// ============================================================
// GET /api/community/posts
// ============================================================
async function listFeed(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return support.sendValidationError(res, errors.array());

  try {
    const result = await community.listPosts({
      page: req.query.page,
      pageSize: req.query.pageSize,
    });
    return support.sendSuccess(
      res,
      {
        items: result.items,
        page: result.page,
        pageSize: result.pageSize,
        totalCount: result.totalCount,
        hasMore: result.hasMore,
      },
      { meta: { source: result.source, generatedAt: new Date().toISOString() } }
    );
  } catch (error) {
    logger.error('communityController.listFeed failed', { error: error.message });
    return support.sendError(res, 500, 'Unable to load feed right now.', 'COMMUNITY_FEED_FAILED');
  }
}

// ============================================================
// GET /api/community/posts/:postId
// ============================================================
async function getPost(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return support.sendValidationError(res, errors.array());

  try {
    const { post, source } = await community.getPost(req.params.postId);
    if (!post) {
      return support.sendError(res, 404, 'Post not found.', 'COMMUNITY_POST_NOT_FOUND');
    }
    return support.sendSuccess(res, { post }, { meta: { source } });
  } catch (error) {
    logger.error('communityController.getPost failed', { error: error.message });
    return support.sendError(res, 500, 'Unable to load post.', 'COMMUNITY_POST_FAILED');
  }
}

// ============================================================
// POST /api/community/posts        (auth)
// ============================================================
async function createPost(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return support.sendValidationError(res, errors.array());

  const user = _userFrom(req);
  if (!user.userId) {
    return support.sendError(res, 401, 'Authentication required.', 'AUTH_REQUIRED');
  }

  try {
    const { post, persistedTo } = await community.createPost({
      userId: user.userId,
      userName: user.name || user.email,
      content: req.body.content,
      imageUrl: req.body.imageUrl,
    });
    return support.sendCreated(
      res,
      { post },
      { meta: { persistedTo, message: 'Post created.' } }
    );
  } catch (error) {
    if (error.statusCode === 400) {
      return support.sendError(res, 400, error.message, error.code || 'VALIDATION_ERROR');
    }
    logger.error('communityController.createPost failed', { error: error.message });
    return support.sendError(res, 500, 'Unable to create post.', 'COMMUNITY_POST_CREATE_FAILED');
  }
}

// ============================================================
// POST /api/community/posts/:postId/like     (auth)  -- toggle
// ============================================================
async function toggleLike(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return support.sendValidationError(res, errors.array());

  const user = _userFrom(req);
  if (!user.userId) {
    return support.sendError(res, 401, 'Authentication required.', 'AUTH_REQUIRED');
  }

  try {
    const { liked, persistedTo } = await community.toggleLike({
      postId: req.params.postId,
      userId: user.userId,
    });

    // Return the post so the client can sync its optimistic state.
    const { post } = await community.getPost(req.params.postId);
    return support.sendSuccess(
      res,
      { liked, post },
      { meta: { persistedTo } }
    );
  } catch (error) {
    logger.error('communityController.toggleLike failed', { error: error.message });
    return support.sendError(res, 500, 'Unable to update like.', 'COMMUNITY_LIKE_FAILED');
  }
}

// ============================================================
// GET /api/community/posts/:postId/comments
// ============================================================
async function listComments(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return support.sendValidationError(res, errors.array());

  try {
    const { items, source } = await community.listComments(req.params.postId);
    return support.sendSuccess(
      res,
      { items },
      { meta: { source, count: items.length } }
    );
  } catch (error) {
    logger.error('communityController.listComments failed', { error: error.message });
    return support.sendError(res, 500, 'Unable to load comments.', 'COMMUNITY_COMMENTS_FAILED');
  }
}

// ============================================================
// POST /api/community/posts/:postId/comments     (auth)
// ============================================================
async function createComment(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return support.sendValidationError(res, errors.array());

  const user = _userFrom(req);
  if (!user.userId) {
    return support.sendError(res, 401, 'Authentication required.', 'AUTH_REQUIRED');
  }

  try {
    const { comment, persistedTo } = await community.createComment({
      postId: req.params.postId,
      userId: user.userId,
      userName: user.name || user.email,
      content: req.body.content,
    });
    return support.sendCreated(res, { comment }, { meta: { persistedTo } });
  } catch (error) {
    if (error.statusCode === 400) {
      return support.sendError(res, 400, error.message, error.code || 'VALIDATION_ERROR');
    }
    logger.error('communityController.createComment failed', { error: error.message });
    return support.sendError(res, 500, 'Unable to add comment.', 'COMMUNITY_COMMENT_FAILED');
  }
}

// ============================================================
// GET /api/community/leaderboard
// ============================================================
async function leaderboard(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return support.sendValidationError(res, errors.array());

  try {
    // currentUserId from auth if present, else from query (optional).
    const currentUserId = req.user?.userId ?? req.query.currentUserId;

    const result = await community.getLeaderboard({
      timeframe: req.query.timeframe,
      currentUserId,
      limit: req.query.limit,
    });
    return support.sendSuccess(
      res,
      {
        timeframe: result.timeframe,
        items: result.items,
        currentUserRank: result.currentUserRank,
      },
      { meta: { source: result.source } }
    );
  } catch (error) {
    logger.error('communityController.leaderboard failed', { error: error.message });
    return support.sendError(res, 500, 'Unable to load leaderboard.', 'COMMUNITY_LEADERBOARD_FAILED');
  }
}

module.exports = {
  listFeed,
  getPost,
  createPost,
  toggleLike,
  listComments,
  createComment,
  leaderboard,
};
