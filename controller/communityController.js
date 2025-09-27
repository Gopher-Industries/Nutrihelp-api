const { validationResult } = require('express-validator');
const communityPostsModel = require('../model/communityPosts');
const communityCommentsModel = require('../model/communityComments');
const communityLikesModel = require('../model/communityLikes');

// Create a new community post
const createPost = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                statusCode: 400,
                error: 'Validation failed', 
                details: errors.array() 
            });
        }

        const { user_id, content, category, tags = [], image_url = null } = req.body;

        const postData = {
            user_id,
            content,
            category,
            tags,
            image_url,
            likes_count: 0,
            comments_count: 0,
            shares_count: 0
        };

        const newPost = await communityPostsModel.createCommunityPost(postData);

        return res.status(201).json({
            statusCode: 201,
            message: 'Post created successfully',
            data: newPost
        });

    } catch (error) {
        console.error('createPost error:', error);
        return res.status(500).json({ 
            statusCode: 500,
            error: 'Internal server error' 
        });
    }
};

// Get all community posts with filters
const getPosts = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                statusCode: 400,
                error: 'Validation failed', 
                details: errors.array() 
            });
        }

        const {
            page = 1,
            limit = 10,
            category = 'all',
            search = null,
            user_id = null,
            sort_by = 'created_at',
            sort_order = 'desc'
        } = req.query;

        const filters = {
            page: parseInt(page),
            limit: parseInt(limit),
            category: category === 'all' ? null : category,
            search,
            user_id: user_id ? parseInt(user_id) : null,
            sort_by,
            sort_order
        };

        const posts = await communityPostsModel.getCommunityPosts(filters);

        return res.status(200).json({
            statusCode: 200,
            message: 'Posts retrieved successfully',
            data: posts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: posts.length
            }
        });

    } catch (error) {
        console.error('getPosts error:', error);
        return res.status(500).json({ 
            statusCode: 500,
            error: 'Internal server error' 
        });
    }
};

// Get a single post by ID
const getPost = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                statusCode: 400,
                error: 'Validation failed', 
                details: errors.array() 
            });
        }

        const { id } = req.params;
        const post = await communityPostsModel.getCommunityPostById(parseInt(id));

        if (!post) {
            return res.status(404).json({
                statusCode: 404,
                error: 'Post not found'
            });
        }

        return res.status(200).json({
            statusCode: 200,
            message: 'Post retrieved successfully',
            data: post
        });

    } catch (error) {
        console.error('getPost error:', error);
        return res.status(500).json({ 
            statusCode: 500,
            error: 'Internal server error' 
        });
    }
};

// Update a post
const updatePost = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                statusCode: 400,
                error: 'Validation failed', 
                details: errors.array() 
            });
        }

        const { id } = req.params;
        const updateData = req.body;

        const updatedPost = await communityPostsModel.updateCommunityPost(parseInt(id), updateData);

        if (!updatedPost) {
            return res.status(404).json({
                statusCode: 404,
                error: 'Post not found'
            });
        }

        return res.status(200).json({
            statusCode: 200,
            message: 'Post updated successfully',
            data: updatedPost
        });

    } catch (error) {
        console.error('updatePost error:', error);
        return res.status(500).json({ 
            statusCode: 500,
            error: 'Internal server error' 
        });
    }
};

// Delete a post
const deletePost = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                statusCode: 400,
                error: 'Validation failed', 
                details: errors.array() 
            });
        }

        const { id } = req.params;
        await communityPostsModel.deleteCommunityPost(parseInt(id));

        return res.status(200).json({
            statusCode: 200,
            message: 'Post deleted successfully'
        });

    } catch (error) {
        console.error('deletePost error:', error);
        return res.status(500).json({ 
            statusCode: 500,
            error: 'Internal server error' 
        });
    }
};

// Get community statistics
const getCommunityStats = async (req, res) => {
    try {
        const stats = await communityPostsModel.getCommunityStats();

        return res.status(200).json({
            statusCode: 200,
            message: 'Community statistics retrieved successfully',
            data: stats
        });

    } catch (error) {
        console.error('getCommunityStats error:', error);
        return res.status(500).json({ 
            statusCode: 500,
            error: 'Internal server error' 
        });
    }
};

// Create a comment
const createComment = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                statusCode: 400,
                error: 'Validation failed', 
                details: errors.array() 
            });
        }

        const { user_id, post_id, content } = req.body;

        const commentData = {
            user_id,
            post_id,
            content
        };

        const newComment = await communityCommentsModel.createCommunityComment(commentData);

        // Update post comments count
        await communityPostsModel.updateCommunityPost(post_id, {
            comments_count: await communityCommentsModel.getCommentCount(post_id)
        });

        return res.status(201).json({
            statusCode: 201,
            message: 'Comment created successfully',
            data: newComment
        });

    } catch (error) {
        console.error('createComment error:', error);
        return res.status(500).json({ 
            statusCode: 500,
            error: 'Internal server error' 
        });
    }
};

// Get comments for a post
const getComments = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                statusCode: 400,
                error: 'Validation failed', 
                details: errors.array() 
            });
        }

        const { postId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const comments = await communityCommentsModel.getCommentsByPostId(
            parseInt(postId), 
            parseInt(page), 
            parseInt(limit)
        );

        return res.status(200).json({
            statusCode: 200,
            message: 'Comments retrieved successfully',
            data: comments,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: comments.length
            }
        });

    } catch (error) {
        console.error('getComments error:', error);
        return res.status(500).json({ 
            statusCode: 500,
            error: 'Internal server error' 
        });
    }
};

// Update a comment
const updateComment = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                statusCode: 400,
                error: 'Validation failed', 
                details: errors.array() 
            });
        }

        const { id } = req.params;
        const { content } = req.body;

        const updatedComment = await communityCommentsModel.updateCommunityComment(parseInt(id), { content });

        if (!updatedComment) {
            return res.status(404).json({
                statusCode: 404,
                error: 'Comment not found'
            });
        }

        return res.status(200).json({
            statusCode: 200,
            message: 'Comment updated successfully',
            data: updatedComment
        });

    } catch (error) {
        console.error('updateComment error:', error);
        return res.status(500).json({ 
            statusCode: 500,
            error: 'Internal server error' 
        });
    }
};

// Delete a comment
const deleteComment = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                statusCode: 400,
                error: 'Validation failed', 
                details: errors.array() 
            });
        }

        const { id } = req.params;
        await communityCommentsModel.deleteCommunityComment(parseInt(id));

        return res.status(200).json({
            statusCode: 200,
            message: 'Comment deleted successfully'
        });

    } catch (error) {
        console.error('deleteComment error:', error);
        return res.status(500).json({ 
            statusCode: 500,
            error: 'Internal server error' 
        });
    }
};

// Like a post
const likePost = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                statusCode: 400,
                error: 'Validation failed', 
                details: errors.array() 
            });
        }

        const { user_id, post_id } = req.body;

        const result = await communityLikesModel.likePost(user_id, post_id);

        if (result.already_liked) {
            return res.status(200).json({
                statusCode: 200,
                message: 'Post already liked',
                data: result
            });
        }

        // Update post likes count
        const likeCount = await communityLikesModel.getLikeCount(post_id);
        await communityPostsModel.updateCommunityPost(post_id, {
            likes_count: likeCount
        });

        return res.status(200).json({
            statusCode: 200,
            message: 'Post liked successfully',
            data: result
        });

    } catch (error) {
        console.error('likePost error:', error);
        return res.status(500).json({ 
            statusCode: 500,
            error: 'Internal server error' 
        });
    }
};

// Unlike a post
const unlikePost = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                statusCode: 400,
                error: 'Validation failed', 
                details: errors.array() 
            });
        }

        const { user_id, post_id } = req.body;

        await communityLikesModel.unlikePost(user_id, post_id);

        // Update post likes count
        const likeCount = await communityLikesModel.getLikeCount(post_id);
        await communityPostsModel.updateCommunityPost(post_id, {
            likes_count: likeCount
        });

        return res.status(200).json({
            statusCode: 200,
            message: 'Post unliked successfully'
        });

    } catch (error) {
        console.error('unlikePost error:', error);
        return res.status(500).json({ 
            statusCode: 500,
            error: 'Internal server error' 
        });
    }
};

// Get user's liked posts
const getUserLikedPosts = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                statusCode: 400,
                error: 'Validation failed', 
                details: errors.array() 
            });
        }

        const { userId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const likedPosts = await communityLikesModel.getUserLikedPosts(
            parseInt(userId), 
            parseInt(page), 
            parseInt(limit)
        );

        return res.status(200).json({
            statusCode: 200,
            message: 'Liked posts retrieved successfully',
            data: likedPosts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: likedPosts.length
            }
        });

    } catch (error) {
        console.error('getUserLikedPosts error:', error);
        return res.status(500).json({ 
            statusCode: 500,
            error: 'Internal server error' 
        });
    }
};

module.exports = {
    createPost,
    getPosts,
    getPost,
    updatePost,
    deletePost,
    getCommunityStats,
    createComment,
    getComments,
    updateComment,
    deleteComment,
    likePost,
    unlikePost,
    getUserLikedPosts
};
