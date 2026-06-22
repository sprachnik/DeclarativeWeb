-- ============================================
-- VibeFeed Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension (should already be enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Users table (profiles linked to auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index for username lookups
CREATE INDEX users_username_idx ON users(username);

-- Vibes table
CREATE TABLE vibes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content JSONB NOT NULL,
  tags TEXT[] DEFAULT '{}',
  chat_history JSONB DEFAULT '{"messages": []}',
  parent_vibe_id UUID REFERENCES vibes(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for vibes
CREATE INDEX vibes_user_id_idx ON vibes(user_id);
CREATE INDEX vibes_created_at_idx ON vibes(created_at DESC);
CREATE INDEX vibes_tags_idx ON vibes USING GIN(tags);
CREATE INDEX vibes_parent_vibe_id_idx ON vibes(parent_vibe_id);

-- Follows table
CREATE TABLE follows (
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (follower_id, following_id)
);

-- Prevent self-follows
ALTER TABLE follows ADD CONSTRAINT no_self_follow CHECK (follower_id != following_id);

-- Create indexes for follows
CREATE INDEX follows_follower_id_idx ON follows(follower_id);
CREATE INDEX follows_following_id_idx ON follows(following_id);

-- Comments table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vibe_id UUID NOT NULL REFERENCES vibes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for comments
CREATE INDEX comments_vibe_id_idx ON comments(vibe_id);
CREATE INDEX comments_user_id_idx ON comments(user_id);
CREATE INDEX comments_created_at_idx ON comments(created_at);

-- Likes table
CREATE TABLE likes (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vibe_id UUID NOT NULL REFERENCES vibes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (user_id, vibe_id)
);

-- Create indexes for likes
CREATE INDEX likes_vibe_id_idx ON likes(vibe_id);
CREATE INDEX likes_user_id_idx ON likes(user_id);

-- User plans table (for freemium/premium tiers)
CREATE TABLE user_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
  monthly_limit INTEGER DEFAULT 10,
  vibes_used INTEGER DEFAULT 0,
  period_start TIMESTAMPTZ DEFAULT date_trunc('month', NOW()),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index for user_plans lookups
CREATE INDEX user_plans_user_id_idx ON user_plans(user_id);

-- Quiz completions table
CREATE TABLE quiz_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vibe_id UUID NOT NULL REFERENCES vibes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  percentage INTEGER NOT NULL,
  answers JSONB NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for quiz completions
CREATE INDEX quiz_completions_vibe_id_idx ON quiz_completions(vibe_id);
CREATE INDEX quiz_completions_user_id_idx ON quiz_completions(user_id);
CREATE INDEX quiz_completions_score_idx ON quiz_completions(vibe_id, score DESC);
CREATE INDEX quiz_completions_completed_at_idx ON quiz_completions(completed_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vibes ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_completions ENABLE ROW LEVEL SECURITY;

-- USERS policies
-- Anyone can read user profiles (public)
CREATE POLICY "Users are viewable by everyone"
  ON users FOR SELECT
  USING (true);

-- Users can insert their own profile (on signup)
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- VIBES policies
-- Anyone can read public vibes
CREATE POLICY "Public vibes are viewable by everyone"
  ON vibes FOR SELECT
  USING (is_public = true OR user_id = auth.uid());

-- Users can insert their own vibes
CREATE POLICY "Users can insert own vibes"
  ON vibes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own vibes
CREATE POLICY "Users can update own vibes"
  ON vibes FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own vibes
CREATE POLICY "Users can delete own vibes"
  ON vibes FOR DELETE
  USING (auth.uid() = user_id);

-- FOLLOWS policies
-- Anyone can see follows (public follower counts)
CREATE POLICY "Follows are viewable by everyone"
  ON follows FOR SELECT
  USING (true);

-- Users can insert their own follows
CREATE POLICY "Users can follow others"
  ON follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- Users can delete their own follows
CREATE POLICY "Users can unfollow others"
  ON follows FOR DELETE
  USING (auth.uid() = follower_id);

-- COMMENTS policies
-- Anyone can read comments on public vibes
CREATE POLICY "Comments on public vibes are viewable"
  ON comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vibes
      WHERE vibes.id = comments.vibe_id
      AND (vibes.is_public = true OR vibes.user_id = auth.uid())
    )
  );

-- Authenticated users can insert comments
CREATE POLICY "Authenticated users can comment"
  ON comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  USING (auth.uid() = user_id);

-- LIKES policies
-- Anyone can see likes (public like counts)
CREATE POLICY "Likes are viewable by everyone"
  ON likes FOR SELECT
  USING (true);

-- Authenticated users can like
CREATE POLICY "Authenticated users can like"
  ON likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can unlike (delete their own likes)
CREATE POLICY "Users can unlike"
  ON likes FOR DELETE
  USING (auth.uid() = user_id);

-- USER_PLANS policies
-- Users can view their own plan
CREATE POLICY "Users can view own plan"
  ON user_plans FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own plan (on signup)
CREATE POLICY "Users can insert own plan"
  ON user_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own plan (for usage tracking)
CREATE POLICY "Users can update own plan"
  ON user_plans FOR UPDATE
  USING (auth.uid() = user_id);

-- QUIZ_COMPLETIONS policies
-- Anyone can view quiz completions (for statistics)
CREATE POLICY "Quiz completions are viewable by everyone"
  ON quiz_completions FOR SELECT
  USING (true);

-- Authenticated users can insert quiz completions
CREATE POLICY "Authenticated users can submit quiz completions"
  ON quiz_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vibes_updated_at
  BEFORE UPDATE ON vibes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_plans_updated_at
  BEFORE UPDATE ON user_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to check if username is available
CREATE OR REPLACE FUNCTION is_username_available(check_username TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM users WHERE LOWER(username) = LOWER(check_username)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get follower count
CREATE OR REPLACE FUNCTION get_follower_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM follows WHERE following_id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get following count
CREATE OR REPLACE FUNCTION get_following_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM follows WHERE follower_id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get vibe counts (likes, comments, shares)
CREATE OR REPLACE FUNCTION get_vibe_counts(vibe_uuid UUID)
RETURNS TABLE (like_count BIGINT, comment_count BIGINT, share_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM likes WHERE vibe_id = vibe_uuid),
    (SELECT COUNT(*) FROM comments WHERE vibe_id = vibe_uuid),
    (SELECT COUNT(*) FROM vibes WHERE parent_vibe_id = vibe_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get quiz statistics (best score per user, aggregated)
CREATE OR REPLACE FUNCTION get_quiz_stats(vibe_uuid UUID)
RETURNS TABLE (
  total_completions BIGINT,
  unique_users BIGINT,
  average_score NUMERIC,
  top_score INTEGER,
  score_distribution JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH best_scores AS (
    SELECT DISTINCT ON (user_id)
      user_id,
      score,
      percentage
    FROM quiz_completions
    WHERE vibe_id = vibe_uuid
    ORDER BY user_id, score DESC, completed_at DESC
  ),
  score_groups AS (
    SELECT
      CASE
        WHEN percentage >= 90 THEN '90-100%'
        WHEN percentage >= 80 THEN '80-89%'
        WHEN percentage >= 70 THEN '70-79%'
        WHEN percentage >= 60 THEN '60-69%'
        WHEN percentage >= 50 THEN '50-59%'
        ELSE '0-49%'
      END as range,
      COUNT(*) as count
    FROM best_scores
    GROUP BY range
  )
  SELECT
    (SELECT COUNT(*) FROM quiz_completions WHERE vibe_id = vibe_uuid),
    (SELECT COUNT(*) FROM best_scores),
    (SELECT COALESCE(ROUND(AVG(score)::numeric, 1), 0) FROM best_scores),
    (SELECT COALESCE(MAX(score), 0) FROM best_scores),
    (SELECT COALESCE(jsonb_object_agg(range, count), '{}'::jsonb) FROM score_groups);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get top quiz scores (distinct by user, best score only)
CREATE OR REPLACE FUNCTION get_quiz_top_scores(vibe_uuid UUID, limit_count INTEGER DEFAULT 3)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  display_name TEXT,
  score INTEGER,
  percentage INTEGER,
  completed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH ranked_scores AS (
    SELECT DISTINCT ON (qc.user_id)
      qc.user_id,
      qc.score,
      qc.percentage,
      qc.completed_at,
      ROW_NUMBER() OVER (ORDER BY qc.score DESC, qc.completed_at ASC) as rank
    FROM quiz_completions qc
    WHERE qc.vibe_id = vibe_uuid
    ORDER BY qc.user_id, qc.score DESC, qc.completed_at ASC
  )
  SELECT
    rs.user_id,
    u.username,
    u.display_name,
    rs.score,
    rs.percentage,
    rs.completed_at
  FROM ranked_scores rs
  JOIN users u ON u.id = rs.user_id
  WHERE rs.rank <= limit_count
  ORDER BY rs.score DESC, rs.completed_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STORAGE (for avatars)
-- ============================================

-- Create avatars bucket (run this separately if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage policy for avatars (users can upload their own)
-- CREATE POLICY "Users can upload own avatar"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Avatars are publicly viewable"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'avatars');

-- ============================================
-- DONE!
-- ============================================
