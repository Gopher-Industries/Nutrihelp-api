const supabase = require('../dbConnection.js');

// Create a new community post
const createCommunityPost = async (postData) => {
    try {
        const { data, error } = await supabase
            .from('community_posts')
            .insert([postData])
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
            console.error('Error creating community post:', error);
            throw error;
        }

        return data;
    } catch (error) {
        console.error('createCommunityPost error:', error);
        throw error;
    }
};

// Get all community posts with pagination and filters
const getCommunityPosts = async (filters = {}) => {
    try {
        const {
            page = 1,
            limit = 10,
            category = null,
            search = null,
            user_id = null,
            sort_by = 'created_at',
            sort_order = 'desc'
        } = filters;

        let query = supabase
            .from('community_posts')
            .select(`
                *,
                users!inner(
                    user_id,
                    name,
                    email,
                    image_id,
                    mfa_enabled
                ),
                community_likes(
                    user_id,
                    created_at
                )
            `);

        // Apply filters
        if (category && category !== 'all') {
            query = query.eq('category', category);
        }

        if (search) {
            query = query.or(`content.ilike.%${search}%,tags.cs.{${search}}`);
        }

        if (user_id) {
            query = query.eq('user_id', user_id);
        }

        // Apply sorting
        query = query.order(sort_by, { ascending: sort_order === 'asc' });

        // Apply pagination
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching community posts:', error);
            throw error;
        }

        return data;
    } catch (error) {
        console.error('getCommunityPosts error:', error);
        throw error;
    }
};

// Get a single community post by ID
const getCommunityPostById = async (postId) => {
    try {
        const { data, error } = await supabase
            .from('community_posts')
            .select(`
                *,
                users!inner(
                    user_id,
                    name,
                    email,
                    image_id,
                    mfa_enabled
                ),
                community_likes(
                    user_id,
                    created_at
                )
            `)
            .eq('id', postId)
            .single();

        if (error) {
            console.error('Error fetching community post:', error);
            throw error;
        }

        return data;
    } catch (error) {
        console.error('getCommunityPostById error:', error);
        throw error;
    }
};

// Update a community post
const updateCommunityPost = async (postId, updateData) => {
    try {
        const { data, error } = await supabase
            .from('community_posts')
            .update(updateData)
            .eq('id', postId)
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
            console.error('Error updating community post:', error);
            throw error;
        }

        return data;
    } catch (error) {
        console.error('updateCommunityPost error:', error);
        throw error;
    }
};

// Delete a community post
const deleteCommunityPost = async (postId) => {
    try {
        const { error } = await supabase
            .from('community_posts')
            .delete()
            .eq('id', postId);

        if (error) {
            console.error('Error deleting community post:', error);
            throw error;
        }

        return { success: true };
    } catch (error) {
        console.error('deleteCommunityPost error:', error);
        throw error;
    }
};

// Get community statistics
const getCommunityStats = async () => {
    try {
        console.log('Fetching community statistics...');
        
        // Get total posts count
        const { count: totalPosts, error: postsError } = await supabase
            .from('community_posts')
            .select('*', { count: 'exact', head: true });

        console.log('Total posts query result:', { totalPosts, postsError });

        // Get total users count
        const { count: totalUsers, error: usersError } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });

        console.log('Total users query result:', { totalUsers, usersError });

        // Get today's posts count - fix date filtering
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        
        console.log('Date range for today posts:', {
            startOfDay: startOfDay.toISOString(),
            endOfDay: endOfDay.toISOString()
        });

        const { count: todayPosts, error: todayError } = await supabase
            .from('community_posts')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startOfDay.toISOString())
            .lt('created_at', endOfDay.toISOString());

        console.log('Today posts query result:', { todayPosts, todayError });

        if (postsError) {
            console.error('Posts count error:', postsError);
        }
        if (usersError) {
            console.error('Users count error:', usersError);
        }
        if (todayError) {
            console.error('Today posts count error:', todayError);
        }

        const stats = {
            total_posts: totalPosts || 0,
            total_members: totalUsers || 0,
            posts_today: todayPosts || 0
        };

        console.log('Final stats:', stats);
        return stats;
    } catch (error) {
        console.error('getCommunityStats error:', error);
        throw error;
    }
};

module.exports = {
    createCommunityPost,
    getCommunityPosts,
    getCommunityPostById,
    updateCommunityPost,
    deleteCommunityPost,
    getCommunityStats
};
