-- Migration: community tables (posts, comments, likes, user_points)
-- Run this in the Supabase SQL editor before deploying the community endpoints.
-- The endpoints fall back to bundled seed data if these tables are missing,
-- so the migration can be applied at any time without downtime.

-- =========================================================================
-- posts
-- =========================================================================
CREATE TABLE IF NOT EXISTS posts (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT        NOT NULL,
  content      TEXT          NOT NULL CHECK (char_length(content) BETWEEN 10 AND 5000),
  image_url    TEXT,
  like_count   INTEGER       NOT NULL DEFAULT 0,
  comment_count INTEGER      NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_id    ON posts (user_id);

-- =========================================================================
-- comments
-- =========================================================================
CREATE TABLE IF NOT EXISTS comments (
  id         BIGSERIAL PRIMARY KEY,
  post_id    BIGINT        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    BIGINT        NOT NULL,
  content    TEXT          NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comments_post_id    ON comments (post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_user_id    ON comments (user_id);

-- =========================================================================
-- post_likes  (one row per (post, user) pair = "user liked this post")
-- =========================================================================
CREATE TABLE IF NOT EXISTS post_likes (
  id         BIGSERIAL PRIMARY KEY,
  post_id    BIGINT        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    BIGINT        NOT NULL,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes (post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes (user_id);

-- =========================================================================
-- user_points  (denormalised running totals for the leaderboard)
-- =========================================================================
CREATE TABLE IF NOT EXISTS user_points (
  user_id    BIGINT        PRIMARY KEY,
  points     INTEGER       NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- =========================================================================
-- user_points_events  (append-only log used by the leaderboard timeframe filter)
-- =========================================================================
CREATE TABLE IF NOT EXISTS user_points_events (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT        NOT NULL,
  points     INTEGER       NOT NULL,
  reason     TEXT,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_points_events_user_created
  ON user_points_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_points_events_created
  ON user_points_events (created_at DESC);
