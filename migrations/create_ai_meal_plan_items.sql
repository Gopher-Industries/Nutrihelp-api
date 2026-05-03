-- Migration: create ai_meal_plan_items table
-- Run this in the Supabase SQL editor before deploying the new endpoints.

CREATE TABLE IF NOT EXISTS ai_meal_plan_items (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT        NOT NULL,
  meal_type   TEXT          NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  day         TEXT,
  name        TEXT          NOT NULL,
  description TEXT,
  calories    NUMERIC,
  proteins    NUMERIC,
  fats        NUMERIC,
  sodium      NUMERIC,
  fiber       NUMERIC,
  vitamins    TEXT,
  ingredients JSONB         DEFAULT '[]',
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Index for fast per-user queries
CREATE INDEX IF NOT EXISTS idx_ai_meal_plan_items_user_id
  ON ai_meal_plan_items (user_id);

-- RLS: users can only see and modify their own rows
ALTER TABLE ai_meal_plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own AI meal items"
  ON ai_meal_plan_items
  FOR ALL
  USING (user_id = auth.uid()::BIGINT)
  WITH CHECK (user_id = auth.uid()::BIGINT);
