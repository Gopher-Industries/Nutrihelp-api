const supabase = require('../dbConnection.js');

// Like a post
const likePost = async (userId, postId) => {
    try {
        // Check if user already liked the post
        const { data: existingLike, error: checkError } = await supabase
            .from('community_likes')
            .select('id')
            .eq('user_id', userId)
            .eq('post_id', postId)
            .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
            console.error('Error checking existing like:', checkError);
            throw checkError;
        }

        if (existingLike) {
            return { message: 'Post already liked', already_liked: true };
        }

        // Add like
        const { data, error } = await supabase
            .from('community_likes')
            .insert([{
                user_id: userId,
                post_id: postId
            }])
            .select()
            .single();

        if (error) {
            console.error('Error liking post:', error);
            throw error;
        }

        return { data, already_liked: false };
    } catch (error) {
        console.error('likePost error:', error);
        throw error;
    }
};

// Unlike a post
const unlikePost = async (userId, postId) => {
    try {
        const { error } = await supabase
            .from('community_likes')
            .delete()
            .eq('user_id', userId)
            .eq('post_id', postId);

        if (error) {
            console.error('Error unliking post:', error);
            throw error;
        }

        return { success: true };
    } catch (error) {
        console.error('unlikePost error:', error);
        throw error;
    }
};

// Get like count for a post
const getLikeCount = async (postId) => {
    try {
        const { count, error } = await supabase
            .from('community_likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', postId);

        if (error) {
            console.error('Error getting like count:', error);
            throw error;
        }

        return count || 0;
    } catch (error) {
        console.error('getLikeCount error:', error);
        throw error;
    }
};

// Check if user liked a post
const checkUserLike = async (userId, postId) => {
    try {
        const { data, error } = await supabase
            .from('community_likes')
            .select('id')
            .eq('user_id', userId)
            .eq('post_id', postId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error checking user like:', error);
            throw error;
        }

        return !!data;
    } catch (error) {
        console.error('checkUserLike error:', error);
        throw error;
    }
};

// Get user's liked posts
const getUserLikedPosts = async (userId, page = 1, limit = 20) => {
    try {
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, error } = await supabase
            .from('community_likes')
            .select(`
                *,
                community_posts!inner(
                    *,
                    users!inner(
                        user_id,
                        name,
                        email,
                        image_id,
                        mfa_enabled
                    )
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) {
            console.error('Error fetching user liked posts:', error);
            throw error;
        }

        return data;
    } catch (error) {
        console.error('getUserLikedPosts error:', error);
        throw error;
    }
};

module.exports = {
    likePost,
    unlikePost,
    getLikeCount,
    checkUserLike,
    getUserLikedPosts
};
