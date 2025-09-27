const supabase = require('../dbConnection.js');

// Create a new comment on a community post
const createCommunityComment = async (commentData) => {
    try {
        const { data, error } = await supabase
            .from('community_comments')
            .insert([commentData])
            .select(`
                *,
                users!inner(
                    user_id,
                    name,
                    email,
                    image_id,
                    mfa_enabled
                )
            `)
            .single();

        if (error) {
            console.error('Error creating community comment:', error);
            throw error;
        }

        return data;
    } catch (error) {
        console.error('createCommunityComment error:', error);
        throw error;
    }
};

// Get comments for a specific post
const getCommentsByPostId = async (postId, page = 1, limit = 20) => {
    try {
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, error } = await supabase
            .from('community_comments')
            .select(`
                *,
                users!inner(
                    user_id,
                    name,
                    email,
                    image_id,
                    mfa_enabled
                )
            `)
            .eq('post_id', postId)
            .order('created_at', { ascending: true })
            .range(from, to);

        if (error) {
            console.error('Error fetching comments:', error);
            throw error;
        }

        return data;
    } catch (error) {
        console.error('getCommentsByPostId error:', error);
        throw error;
    }
};

// Update a comment
const updateCommunityComment = async (commentId, updateData) => {
    try {
        const { data, error } = await supabase
            .from('community_comments')
            .update(updateData)
            .eq('id', commentId)
            .select(`
                *,
                users!inner(
                    user_id,
                    name,
                    email,
                    image_id,
                    mfa_enabled
                )
            `)
            .single();

        if (error) {
            console.error('Error updating comment:', error);
            throw error;
        }

        return data;
    } catch (error) {
        console.error('updateCommunityComment error:', error);
        throw error;
    }
};

// Delete a comment
const deleteCommunityComment = async (commentId) => {
    try {
        const { error } = await supabase
            .from('community_comments')
            .delete()
            .eq('id', commentId);

        if (error) {
            console.error('Error deleting comment:', error);
            throw error;
        }

        return { success: true };
    } catch (error) {
        console.error('deleteCommunityComment error:', error);
        throw error;
    }
};

// Get comment count for a post
const getCommentCount = async (postId) => {
    try {
        const { count, error } = await supabase
            .from('community_comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', postId);

        if (error) {
            console.error('Error getting comment count:', error);
            throw error;
        }

        return count || 0;
    } catch (error) {
        console.error('getCommentCount error:', error);
        throw error;
    }
};

module.exports = {
    createCommunityComment,
    getCommentsByPostId,
    updateCommunityComment,
    deleteCommunityComment,
    getCommentCount
};
