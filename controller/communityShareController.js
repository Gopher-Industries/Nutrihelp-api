const { supabase } = require('../database/supabase');

// Share a community post
const sharePost = async (req, res) => {
    try {
        const { user_id, post_id, share_platform = 'copy_link' } = req.body;

        if (!user_id || !post_id) {
            return res.status(400).json({
                success: false,
                error: 'User ID and Post ID are required'
            });
        }

        // Check if post exists
        const { data: post, error: postError } = await supabase
            .from('community_posts')
            .select('id')
            .eq('id', post_id)
            .single();

        if (postError || !post) {
            return res.status(404).json({
                success: false,
                error: 'Post not found'
            });
        }

        // Create share record
        const { data: shareData, error: shareError } = await supabase
            .from('community_shares')
            .insert([{
                user_id: parseInt(user_id),
                post_id: parseInt(post_id),
                share_platform: share_platform
            }])
            .select();

        if (shareError) {
            console.error('Error creating share:', shareError);
            return res.status(500).json({
                success: false,
                error: 'Failed to record share',
                details: shareError.message
            });
        }

        // Update post shares count
        const { data: sharesCount, error: countError } = await supabase
            .from('community_shares')
            .select('id', { count: 'exact' })
            .eq('post_id', post_id);

        if (!countError && sharesCount) {
            await supabase
                .from('community_posts')
                .update({ shares_count: sharesCount.length })
                .eq('id', post_id);
        }

        return res.status(201).json({
            success: true,
            message: 'Post shared successfully',
            data: shareData[0]
        });

    } catch (error) {
        console.error('Share post error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Get share count for a post
const getShareCount = async (req, res) => {
    try {
        const { postId } = req.params;

        const { data: shares, error } = await supabase
            .from('community_shares')
            .select('id', { count: 'exact' })
            .eq('post_id', postId);

        if (error) {
            console.error('Error getting share count:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to get share count'
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                share_count: shares ? shares.length : 0
            }
        });

    } catch (error) {
        console.error('Get share count error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

module.exports = {
    sharePost,
    getShareCount
};
