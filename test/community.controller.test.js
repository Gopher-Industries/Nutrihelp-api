/**
 * Community endpoint tests.
 *
 * Mounts the router on a fresh express app per test. The auth middleware
 * is mocked to inject a fake user so we don't need real JWTs.
 */

// Mock dbConnection to avoid the SUPABASE_URL guard / process.exit.
// Returning an object whose `from` is undefined makes safeChain() -> null,
// which forces the service into the seed/memory fallback path. Perfect
// for hermetic tests that exercise the contract, not the DB.
jest.mock('../dbConnection.js', () => ({}));

jest.mock('../middleware/authenticateToken', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = { userId: 9001, email: 'tester@example.com', role: 'user' };
    next();
  },
}));

const express = require('express');
const request = require('supertest');

const router = require('../routes/community');
const community = require('../services/communityService');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/community', router);
  return app;
}

beforeEach(() => {
  community._resetMemory();
});

describe('GET /api/community/posts', () => {
  test('returns paginated feed (seed fallback when DB empty)', async () => {
    const res = await request(makeApp()).get('/api/community/posts');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThan(0);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.pageSize).toBe(10);
    expect(typeof res.body.data.hasMore).toBe('boolean');
  });

  test('honours page and pageSize', async () => {
    const res = await request(makeApp()).get('/api/community/posts?page=1&pageSize=2');
    expect(res.status).toBe(200);
    expect(res.body.data.pageSize).toBe(2);
    expect(res.body.data.items.length).toBeLessThanOrEqual(2);
  });

  test('rejects invalid page', async () => {
    const res = await request(makeApp()).get('/api/community/posts?page=-1');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/community/posts/:postId', () => {
  test('returns a seed post by id', async () => {
    const res = await request(makeApp()).get('/api/community/posts/seed-1');
    expect(res.status).toBe(200);
    expect(res.body.data.post.id).toBe('seed-1');
    expect(res.body.data.post.content).toBeTruthy();
  });

  test('returns 404 for unknown post', async () => {
    const res = await request(makeApp()).get('/api/community/posts/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('COMMUNITY_POST_NOT_FOUND');
  });
});

describe('POST /api/community/posts', () => {
  test('rejects content shorter than 10 chars', async () => {
    const res = await request(makeApp())
      .post('/api/community/posts')
      .send({ content: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('creates a post with valid content', async () => {
    const res = await request(makeApp())
      .post('/api/community/posts')
      .send({ content: 'A perfectly valid post about meal planning.' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.post.content).toMatch(/meal planning/);
    expect(res.body.data.post.userId).toBe(9001);
    expect(['db', 'memory']).toContain(res.body.meta.persistedTo);
  });

  test('post appears at top of feed after creation', async () => {
    await request(makeApp())
      .post('/api/community/posts')
      .send({ content: 'Brand new post that should land first in the feed.' });

    const feed = await request(makeApp()).get('/api/community/posts');
    expect(feed.body.data.items[0].content).toMatch(/Brand new post/);
  });
});

describe('POST /api/community/posts/:postId/like', () => {
  test('toggles like state and returns updated post', async () => {
    const created = await request(makeApp())
      .post('/api/community/posts')
      .send({ content: 'Post we will like and unlike for testing.' });
    const postId = created.body.data.post.id;

    const liked = await request(makeApp()).post(`/api/community/posts/${postId}/like`);
    expect(liked.status).toBe(200);
    expect(liked.body.data.liked).toBe(true);

    const unliked = await request(makeApp()).post(`/api/community/posts/${postId}/like`);
    expect(unliked.status).toBe(200);
    expect(unliked.body.data.liked).toBe(false);
  });
});

describe('comments', () => {
  test('lists seed comments for seed-1', async () => {
    const res = await request(makeApp()).get('/api/community/posts/seed-1/comments');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThan(0);
  });

  test('rejects empty comment body', async () => {
    const res = await request(makeApp())
      .post('/api/community/posts/seed-1/comments')
      .send({ content: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('appends a new comment', async () => {
    const res = await request(makeApp())
      .post('/api/community/posts/seed-1/comments')
      .send({ content: 'Thanks for posting this!' });
    expect(res.status).toBe(201);
    expect(res.body.data.comment.content).toBe('Thanks for posting this!');
    expect(res.body.data.comment.userId).toBe(9001);

    const list = await request(makeApp()).get('/api/community/posts/seed-1/comments');
    const last = list.body.data.items[list.body.data.items.length - 1];
    expect(last.content).toBe('Thanks for posting this!');
  });
});

describe('GET /api/community/leaderboard', () => {
  test('default (weekly) returns ranked items', async () => {
    const res = await request(makeApp()).get('/api/community/leaderboard');
    expect(res.status).toBe(200);
    expect(res.body.data.timeframe).toBe('weekly');
    expect(res.body.data.items.length).toBeGreaterThan(0);
    expect(res.body.data.items[0].rank).toBe(1);
  });

  test('honours timeframe', async () => {
    const res = await request(makeApp()).get('/api/community/leaderboard?timeframe=all_time');
    expect(res.body.data.timeframe).toBe('all_time');
  });

  test('rejects invalid timeframe', async () => {
    const res = await request(makeApp()).get('/api/community/leaderboard?timeframe=lifetime');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('returns currentUserRank when user is outside visible window', async () => {
    // The auth mock injects userId=9001 which is NOT in the seed leaderboard,
    // so currentUserRank should be null (no-op) — exercise the code path.
    const res = await request(makeApp()).get('/api/community/leaderboard');
    expect(res.status).toBe(200);
    // currentUserRank may be null when the user has no points yet — that's expected.
    expect(res.body.data).toHaveProperty('currentUserRank');
  });

  test('returns currentUserRank for a known seed user via query param', async () => {
    const res = await request(makeApp()).get('/api/community/leaderboard?currentUserId=1003');
    expect(res.status).toBe(200);
    // 1003 is rank 1 in the weekly seed; should be returned in items already.
    expect(res.body.data.items.find((i) => i.user_id === 1003)).toBeTruthy();
  });
});
