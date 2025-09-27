-- Community Database Tables for Supabase
-- Execute this SQL in your Supabase SQL Editor

-- 1. Community Posts Table
CREATE TABLE IF NOT EXISTS community_posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (length(content) >= 10 AND length(content) <= 2000),
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'weight-loss', 
        'fitness', 
        'dietary-restrictions', 
        'meal-prep', 
        'nutrition-tips', 
        'success-story', 
        'recipe-share', 
        'motivation'
    )),
    tags TEXT[] DEFAULT '{}',
    image_url TEXT,
    likes_count INTEGER DEFAULT 0 CHECK (likes_count >= 0),
    comments_count INTEGER DEFAULT 0 CHECK (comments_count >= 0),
    shares_count INTEGER DEFAULT 0 CHECK (shares_count >= 0),
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Community Comments Table
CREATE TABLE IF NOT EXISTS community_comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (length(content) >= 1 AND length(content) <= 500),
    parent_comment_id INTEGER REFERENCES community_comments(id) ON DELETE CASCADE,
    is_edited BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Community Likes Table
CREATE TABLE IF NOT EXISTS community_likes (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, user_id)
);

-- 4. Community Bookmarks Table (for future use)
CREATE TABLE IF NOT EXISTS community_bookmarks (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, user_id)
);

-- 5. Community Shares Table (for future use)
CREATE TABLE IF NOT EXISTS community_shares (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    share_platform VARCHAR(50), -- 'facebook', 'twitter', 'linkedin', 'copy_link', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_community_posts_user_id ON community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_category ON community_posts(category);
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_likes_count ON community_posts(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_tags ON community_posts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_community_posts_content_search ON community_posts USING GIN(to_tsvector('english', content));

CREATE INDEX IF NOT EXISTS idx_community_comments_post_id ON community_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_user_id ON community_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_created_at ON community_comments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_likes_post_id ON community_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_community_likes_user_id ON community_likes(user_id);

CREATE INDEX IF NOT EXISTS idx_community_bookmarks_post_id ON community_bookmarks(post_id);
CREATE INDEX IF NOT EXISTS idx_community_bookmarks_user_id ON community_bookmarks(user_id);

CREATE INDEX IF NOT EXISTS idx_community_shares_post_id ON community_shares(post_id);
CREATE INDEX IF NOT EXISTS idx_community_shares_user_id ON community_shares(user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_community_posts_updated_at 
    BEFORE UPDATE ON community_posts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_community_comments_updated_at 
    BEFORE UPDATE ON community_comments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update post counts when comments are added/deleted
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE community_posts 
        SET comments_count = comments_count + 1 
        WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE community_posts 
        SET comments_count = comments_count - 1 
        WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_post_comment_count_trigger
    AFTER INSERT OR DELETE ON community_comments
    FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

-- Function to update post likes count when likes are added/deleted
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE community_posts 
        SET likes_count = likes_count + 1 
        WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE community_posts 
        SET likes_count = likes_count - 1 
        WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_post_likes_count_trigger
    AFTER INSERT OR DELETE ON community_likes
    FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();

-- Insert sample data for testing
INSERT INTO community_posts (user_id, content, category, tags, image_url) VALUES
(1, 'Just completed my first 30-day healthy eating challenge! 🎉 The key was meal prepping on Sundays and having healthy snacks ready. Lost 8 pounds and feel so much more energetic. Anyone else doing similar challenges?', 'weight-loss', ARRAY['weight-loss', 'meal-prep', 'healthy-eating'], 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop'),
(2, 'Found this amazing protein smoothie recipe that''s perfect for post-workout recovery. 25g protein, low sugar, and tastes amazing! Recipe in comments 👇', 'fitness', ARRAY['protein', 'smoothie', 'post-workout'], 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600&h=400&fit=crop'),
(3, 'Struggling with gluten sensitivity? Here are my top 5 gluten-free alternatives that actually taste good! Quinoa pasta, almond flour, and more. What''s your favorite gluten-free substitute?', 'dietary-restrictions', ARRAY['gluten-free', 'dietary-restrictions', 'healthy-alternatives'], 'https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=600&h=400&fit=crop');

-- Insert sample comments
INSERT INTO community_comments (post_id, user_id, content) VALUES
(1, 2, 'Congratulations! That''s amazing progress. I''m starting my own 30-day challenge next week. Any tips for meal prep?'),
(1, 3, 'Great job! I''ve been doing meal prep for 6 months now and it''s been a game changer.'),
(2, 1, 'This looks delicious! Can you share the recipe?'),
(2, 3, 'I make something similar with spinach and banana. So good!'),
(3, 1, 'I love quinoa pasta! Have you tried chickpea pasta? It''s also great.'),
(3, 2, 'Almond flour is my go-to for baking. Works great in pancakes too!');

-- Insert sample likes
INSERT INTO community_likes (post_id, user_id) VALUES
(1, 2), (1, 3), (1, 4),
(2, 1), (2, 3), (2, 4), (2, 5),
(3, 1), (3, 2), (3, 4), (3, 5), (3, 6);

-- Insert sample bookmarks
INSERT INTO community_bookmarks (post_id, user_id) VALUES
(1, 2), (1, 3),
(2, 1), (2, 4),
(3, 1), (3, 2), (3, 5);

-- Insert sample shares
INSERT INTO community_shares (post_id, user_id, share_platform) VALUES
(1, 2, 'facebook'),
(1, 3, 'twitter'),
(2, 1, 'copy_link'),
(2, 4, 'linkedin'),
(3, 1, 'facebook'),
(3, 2, 'twitter'),
(3, 5, 'copy_link');
