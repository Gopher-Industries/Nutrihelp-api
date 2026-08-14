/**
 * services/communityService.js
 *
 * Backing service for the community routes (feed, post detail, comments,
 * likes, leaderboard).
 *
 * Strategy:
 *   - Each function tries the Supabase tables defined in
 *     migrations/create_community_tables.sql.
 *   - On any DB error or empty result we fall back to bundled seed data
 *     from controller/supportData/communitySeed.js so the frontend never
 *     sees a blank screen while content is being provisioned.
 *   - Writes (createPost, createComment, toggleLike) require a userId
 *     and persist to the DB. If the DB is unavailable we record the
 *     write in an in-memory store and surface `meta.persistedTo: 'memory'`
 *     so the client can warn during development.
 */

const supabase = require('../dbConnection.js');
const logger = require('../utils/logger');
const seed = require('../controller/supportData/communitySeed');

// --- in-memory fallback store -------------------------------------------
const memoryStore = {
  posts: [],
  commentsByPost: new Map(),
  likesByPost: new Map(), // post_id -> Set<user_id>
  nextPostId: 9_000_000,
  nextCommentId: 9_500_000,
};

function nowIso() {
  return new Date().toISOString();
}

function safeChain() {
  if (!supabase || typeof supabase.from !== 'function') return null;
  return supabase;
}

function shapePost(row) {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name || row.userName || `User ${row.user_id}`,
    userAvatarUrl: row.user_avatar_url || null,
    content: row.content,
    imageUrl: row.image_url || null,
    likeCount: row.like_count ?? 0,
    commentCount: row.comment_count ?? 0,
    createdAt: row.created_at,
  };
}

function shapeComment(row) {
  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    userName: row.user_name || row.userName || `User ${row.user_id}`,
    content: row.content,
    createdAt: row.created_at,
  };
}

// =========================================================================
// FEED
// =========================================================================

/**
 * Paginated feed (newest first).
 * @param {{ page?:number, pageSize?:number }} opts
 */
async function listPosts({ page = 1, pageSize = 10 } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeSize = Math.min(50, Math.max(1, Number(pageSize) || 10));
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize - 1;

  // Try DB
  try {
    const sb = safeChain();
    if (sb) {
      const { data, error, count } = await sb
        .from('posts')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (!error && data && data.length > 0) {
        // Add in-memory writes that aren't in the DB yet.
        return {
          source: 'db',
          page: safePage,
          pageSize: safeSize,
          totalCount: count ?? data.length,
          hasMore: (count ?? data.length) > to + 1,
          items: data.map(shapePost),
        };
      }
    }
  } catch (err) {
    logger.warn('communityService.listPosts: db error, falling back to seed', { error: err.message });
  }

  // Combined fallback: any in-memory writes + seed posts
  const combined = [...memoryStore.posts, ...seed.POSTS]
    .map(shapePost)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const slice = combined.slice(from, from + safeSize);
  return {
    source: combined.length > seed.POSTS.length ? 'memory+seed' : 'seed',
    page: safePage,
    pageSize: safeSize,
    totalCount: combined.length,
    hasMore: from + safeSize < combined.length,
    items: slice,
  };
}

// =========================================================================
// POST DETAIL
// =========================================================================

async function getPost(postId) {
  if (!postId) throw new Error('postId required');

  try {
    const sb = safeChain();
    if (sb) {
      const { data, error } = await sb
        .from('posts')
        .select('*')
        .eq('id', postId)
        .maybeSingle();

      if (!error && data) {
        return { source: 'db', post: shapePost(data) };
      }
    }
  } catch (err) {
    logger.warn('communityService.getPost: db error, falling back', { error: err.message, postId });
  }

  // Memory then seed
  const inMem = memoryStore.posts.find((p) => String(p.id) === String(postId));
  if (inMem) return { source: 'memory', post: shapePost(inMem) };

  const seedPost = seed.POSTS.find((p) => String(p.id) === String(postId));
  if (seedPost) return { source: 'seed', post: shapePost(seedPost) };

  return { source: null, post: null };
}

// =========================================================================
// CREATE POST
// =========================================================================

async function createPost({ userId, userName, content, imageUrl }) {
  if (!userId) throw new Error('userId required');
  if (!content || content.trim().length < 10) {
    const err = new Error('Content must be at least 10 characters');
    err.statusCode = 400;
    err.code = 'CONTENT_TOO_SHORT';
    throw err;
  }

  const newRow = {
    user_id: userId,
    user_name: userName || `User ${userId}`,
    content: content.trim(),
    image_url: imageUrl || null,
    like_count: 0,
    comment_count: 0,
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  try {
    const sb = safeChain();
    if (sb) {
      const { data, error } = await sb
        .from('posts')
        .insert(newRow)
        .select()
        .maybeSingle();
      if (!error && data) {
        return { persistedTo: 'db', post: shapePost(data) };
      }
    }
  } catch (err) {
    logger.warn('communityService.createPost: db insert failed, using memory', { error: err.message });
  }

  // Memory fallback
  const memRow = { ...newRow, id: ++memoryStore.nextPostId };
  memoryStore.posts.unshift(memRow);
  return { persistedTo: 'memory', post: shapePost(memRow) };
}

// =========================================================================
// LIKES
// =========================================================================

/**
 * Toggle the like state for (postId, userId). Returns the new like count
 * and whether the user now likes the post.
 */
async function toggleLike({ postId, userId }) {
  if (!postId) throw new Error('postId required');
  if (!userId) throw new Error('userId required');

  try {
    const sb = safeChain();
    if (sb) {
      // Check existing like
      const { data: existing, error: lookupError } = await sb
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!lookupError) {
        if (existing) {
          // Unlike
          await sb.from('post_likes').delete().eq('id', existing.id);
          // Decrement counter best-effort
          await _adjustLikeCount(sb, postId, -1);
          return { liked: false, persistedTo: 'db' };
        }
        // Like
        await sb.from('post_likes').insert({ post_id: postId, user_id: userId });
        await _adjustLikeCount(sb, postId, +1);
        return { liked: true, persistedTo: 'db' };
      }
    }
  } catch (err) {
    logger.warn('communityService.toggleLike: db failed, using memory', { error: err.message, postId, userId });
  }

  // Memory fallback
  const set = memoryStore.likesByPost.get(String(postId)) || new Set();
  const had = set.has(userId);
  if (had) set.delete(userId);
  else set.add(userId);
  memoryStore.likesByPost.set(String(postId), set);
  return { liked: !had, persistedTo: 'memory' };
}

async function _adjustLikeCount(sb, postId, delta) {
  try {
    const { data, error } = await sb.from('posts').select('like_count').eq('id', postId).maybeSingle();
    if (error || !data) return;
    const next = Math.max(0, (data.like_count ?? 0) + delta);
    await sb.from('posts').update({ like_count: next }).eq('id', postId);
  } catch (err) {
    logger.warn('communityService._adjustLikeCount failed', { error: err.message });
  }
}

// =========================================================================
// COMMENTS
// =========================================================================

async function listComments(postId) {
  if (!postId) throw new Error('postId required');

  try {
    const sb = safeChain();
    if (sb) {
      const { data, error } = await sb
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      if (!error && data && data.length > 0) {
        return { source: 'db', items: data.map(shapeComment) };
      }
    }
  } catch (err) {
    logger.warn('communityService.listComments: db error, falling back', { error: err.message, postId });
  }

  const memList = memoryStore.commentsByPost.get(String(postId)) || [];
  const seedList = seed.COMMENTS[postId] || [];
  const items = [...seedList, ...memList].map(shapeComment);
  return { source: items.length > seedList.length ? 'memory+seed' : 'seed', items };
}

async function createComment({ postId, userId, userName, content }) {
  if (!postId) throw new Error('postId required');
  if (!userId) throw new Error('userId required');
  if (!content || content.trim().length < 1) {
    const err = new Error('Comment cannot be empty');
    err.statusCode = 400;
    err.code = 'COMMENT_EMPTY';
    throw err;
  }

  const newRow = {
    post_id: postId,
    user_id: userId,
    user_name: userName || `User ${userId}`,
    content: content.trim(),
    created_at: nowIso(),
  };

  try {
    const sb = safeChain();
    if (sb) {
      const { data, error } = await sb
        .from('comments')
        .insert(newRow)
        .select()
        .maybeSingle();
      if (!error && data) {
        // Best-effort comment_count bump
        try {
          const { data: post } = await sb
            .from('posts')
            .select('comment_count')
            .eq('id', postId)
            .maybeSingle();
          if (post) {
            await sb
              .from('posts')
              .update({ comment_count: (post.comment_count ?? 0) + 1 })
              .eq('id', postId);
          }
        } catch (_) {}
        return { persistedTo: 'db', comment: shapeComment(data) };
      }
    }
  } catch (err) {
    logger.warn('communityService.createComment: db insert failed, using memory', { error: err.message });
  }

  const memRow = { ...newRow, id: ++memoryStore.nextCommentId };
  const list = memoryStore.commentsByPost.get(String(postId)) || [];
  list.push(memRow);
  memoryStore.commentsByPost.set(String(postId), list);
  return { persistedTo: 'memory', comment: shapeComment(memRow) };
}

// =========================================================================
// LEADERBOARD
// =========================================================================

const TIMEFRAMES = new Set(['weekly', 'monthly', 'all_time']);

function _timeframeBoundary(timeframe) {
  const now = Date.now();
  if (timeframe === 'weekly') return new Date(now - 7 * 86_400_000).toISOString();
  if (timeframe === 'monthly') return new Date(now - 30 * 86_400_000).toISOString();
  return null; // all_time
}

async function getLeaderboard({ timeframe = 'weekly', currentUserId, limit = 10 } = {}) {
  const tf = TIMEFRAMES.has(timeframe) ? timeframe : 'weekly';
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));

  let items = null;
  let source = 'seed';

  try {
    const sb = safeChain();
    if (sb) {
      const boundary = _timeframeBoundary(tf);
      if (boundary) {
        // Aggregate from points events within window
        const { data, error } = await sb
          .from('user_points_events')
          .select('user_id, points')
          .gte('created_at', boundary);
        if (!error && data && data.length > 0) {
          const totals = new Map();
          data.forEach((e) => {
            totals.set(e.user_id, (totals.get(e.user_id) || 0) + (e.points || 0));
          });
          items = Array.from(totals.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, safeLimit)
            .map(([user_id, points], idx) => ({
              rank: idx + 1,
              user_id,
              user_name: `User ${user_id}`,
              user_avatar_url: null,
              points,
            }));
          source = 'db';
        }
      } else {
        // all_time -> totals table
        const { data, error } = await sb
          .from('user_points')
          .select('user_id, points')
          .order('points', { ascending: false })
          .limit(safeLimit);
        if (!error && data && data.length > 0) {
          items = data.map((row, idx) => ({
            rank: idx + 1,
            user_id: row.user_id,
            user_name: `User ${row.user_id}`,
            user_avatar_url: null,
            points: row.points,
          }));
          source = 'db';
        }
      }
    }
  } catch (err) {
    logger.warn('communityService.getLeaderboard: db error, falling back to seed', { error: err.message });
  }

  if (!items) {
    items = (seed.LEADERBOARD[tf] || []).slice(0, safeLimit);
  }

  // Compute current-user rank if not in visible list
  let currentUserRank = null;
  if (currentUserId) {
    const inVisible = items.find((r) => String(r.user_id) === String(currentUserId));
    if (inVisible) {
      currentUserRank = inVisible;
    } else {
      // search the wider seed for an approximation
      const wider = seed.LEADERBOARD[tf] || [];
      const found = wider.find((r) => String(r.user_id) === String(currentUserId));
      currentUserRank = found || null;
    }
  }

  return { timeframe: tf, source, items, currentUserRank };
}

// =========================================================================
// Test helpers
// =========================================================================

function _resetMemory() {
  memoryStore.posts.length = 0;
  memoryStore.commentsByPost.clear();
  memoryStore.likesByPost.clear();
}

module.exports = {
  listPosts,
  getPost,
  createPost,
  toggleLike,
  listComments,
  createComment,
  getLeaderboard,
  _resetMemory,
  TIMEFRAMES: Array.from(TIMEFRAMES),
};
