-- Cloudflare D1 Migration: Response Feedback Learning System
-- Supports YouTube-Style Like / Dislike personalization across situation contexts

CREATE TABLE IF NOT EXISTS response_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id TEXT,
  suggestion_text TEXT NOT NULL,
  rating TEXT NOT NULL,
  situation_context TEXT NOT NULL DEFAULT 'general',
  tone TEXT,
  style_tags TEXT,
  length_category TEXT,
  reasoning TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feedback_context_rating ON response_feedback(situation_context, rating);
