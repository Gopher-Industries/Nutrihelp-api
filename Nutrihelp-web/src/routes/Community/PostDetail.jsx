import React, { useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserContext } from '../../context/user.context';
import { useDarkMode } from '../DarkModeToggle/DarkModeContext';
import { motion } from 'framer-motion';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  ArrowLeft,
  Send,
  MoreVertical,
  Edit,
  Trash2,
  Flag
} from 'lucide-react';
import './PostDetail.css';

const PostDetail = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useContext(UserContext);
  const { darkMode } = useDarkMode();
  
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data - in real app, this would come from API
  const mockPost = {
    id: parseInt(postId),
    author: {
      name: 'Sarah Johnson',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      verified: true
    },
    content: 'Just completed my first 30-day healthy eating challenge! The key was meal prepping on Sundays and having healthy snacks ready. Lost 8 pounds and feel so much more energetic. Anyone else doing similar challenges?',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=600&fit=crop',
    category: 'weight-loss',
    likes: 124,
    comments: 23,
    shares: 8,
    timestamp: '2 hours ago',
    tags: ['#weight-loss', '#meal-prep', '#healthy-eating']
  };

  const mockComments = [
    {
      id: 1,
      author: {
        name: 'Mike Chen',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
        verified: false
      },
      content: 'Congratulations! I\'m on day 15 of my challenge. Meal prep has been a game changer for me too!',
      timestamp: '1 hour ago',
      likes: 12,
      replies: [
        {
          id: 11,
          author: {
            name: 'Sarah Johnson',
            avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
            verified: true
          },
          content: 'Keep going! You\'re doing great!',
          timestamp: '45 minutes ago',
          likes: 3
        }
      ]
    },
    {
      id: 2,
      author: {
        name: 'Emma Davis',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
        verified: true
      },
      content: 'What are your favorite meal prep recipes? I\'m always looking for new ideas!',
      timestamp: '30 minutes ago',
      likes: 8,
      replies: []
    }
  ];

  React.useEffect(() => {
    // Load post from localStorage
    const savedPosts = localStorage.getItem('community_posts');
    if (savedPosts) {
      const posts = JSON.parse(savedPosts);
      const foundPost = posts.find(p => p.id === parseInt(postId));
      if (foundPost) {
        setPost(foundPost);
        setComments(mockComments); // Keep mock comments for now
        setIsLoading(false);
      } else {
        setIsLoading(false);
      }
    } else {
      // Fallback to mock data
      setPost(mockPost);
      setComments(mockComments);
      setIsLoading(false);
    }
  }, [postId]);

  // Handle scroll to comments when URL has #comments hash
  React.useEffect(() => {
    if (window.location.hash === '#comments') {
      setTimeout(() => {
        document.querySelector('.comments-section')?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }, 500);
    }
  }, [post]);

  const handleLike = () => {
    setIsLiked(!isLiked);
    if (!isLiked) {
      setPost(prev => ({ ...prev, likes: prev.likes + 1 }));
    } else {
      setPost(prev => ({ ...prev, likes: prev.likes - 1 }));
    }
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
  };

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const comment = {
      id: Date.now(),
      author: {
        name: currentUser?.displayName || 'Anonymous User',
        avatar: currentUser?.photoURL || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        verified: false
      },
      content: newComment,
      timestamp: 'Just now',
      likes: 0,
      replies: []
    };

    setComments(prev => [comment, ...prev]);
    setNewComment('');
  };

  const handleEditPost = () => {
    // Navigate to edit page or open edit modal
    // For now, just show an alert - in a real app, this would open an edit modal
    alert('Edit functionality will be implemented in the next update. For now, you can delete and recreate the post.');
  };

  const handleDeletePost = () => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      // Get current posts from localStorage
      const savedPosts = localStorage.getItem('community_posts');
      if (savedPosts) {
        const posts = JSON.parse(savedPosts);
        // Filter out the deleted post
        const updatedPosts = posts.filter(p => p.id !== parseInt(postId));
        // Save updated posts back to localStorage
        localStorage.setItem('community_posts', JSON.stringify(updatedPosts));
      }
      // Navigate back to community
      navigate('/community');
    }
  };

  const getCategoryClass = (category) => {
    const categoryClasses = {
      'weight-loss': 'category-weight-loss',
      'fitness': 'category-fitness',
      'dietary-restrictions': 'category-dietary-restrictions',
      'meal-prep': 'category-meal-prep',
      'nutrition-tips': 'category-nutrition-tips'
    };
    return categoryClasses[category] || 'category-weight-loss';
  };

  if (isLoading) {
    return (
      <div className={`post-detail-page ${darkMode ? 'dark-mode' : ''}`}>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading post...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className={`post-detail-page ${darkMode ? 'dark-mode' : ''}`}>
        <div className="error-container">
          <h2>Post not found</h2>
          <button onClick={() => navigate('/community')} className="back-btn">
            <ArrowLeft size={20} />
            Back to Community
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`post-detail-page ${darkMode ? 'dark-mode' : ''}`}>
      <div className="post-detail-container">
        {/* Header */}
        <div className="post-detail-header">
          <button 
            className="back-btn"
            onClick={() => navigate('/community')}
          >
            <ArrowLeft size={20} />
            Back to Community
          </button>
          
          {currentUser && (
            <div className="post-actions">
              <button 
                className="action-btn"
                onClick={() => setShowOptions(!showOptions)}
              >
                <MoreVertical size={20} />
              </button>
              
              {showOptions && (
                <div className="options-dropdown">
                  <button onClick={handleEditPost} className="option-btn">
                    <Edit size={16} />
                    Edit Post
                  </button>
                  <button onClick={handleDeletePost} className="option-btn delete">
                    <Trash2 size={16} />
                    Delete Post
                  </button>
                  <button className="option-btn">
                    <Flag size={16} />
                    Report
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Post Content */}
        <motion.div 
          className="post-detail-content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="post-header">
            <div className="author-info">
              <img 
                src={post.author.avatar} 
                alt={post.author.name}
                className="author-avatar"
              />
              <div className="author-details">
                <div className="author-name">
                  {post.author.name}
                  {post.author.verified && (
                    <span className="verified-badge">✓</span>
                  )}
                </div>
                <div className="post-timestamp">{post.timestamp}</div>
              </div>
            </div>
            <div className="post-category">
              <span className={`category-badge ${getCategoryClass(post.category)}`}>
                {post.category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </div>
          </div>

          <div className="post-content">
            <p className="post-text">{post.content}</p>
            {post.image && (
              <img 
                src={post.image} 
                alt="Post content"
                className="post-image"
              />
            )}
            {post.tags && post.tags.length > 0 && (
              <div className="post-tags">
                {post.tags.map((tag, index) => (
                  <span key={index} className="post-tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="post-actions-bar">
            <button 
              className={`action-btn ${isLiked ? 'liked' : ''}`}
              onClick={handleLike}
            >
              <Heart size={18} />
              {post.likes}
            </button>
            <button 
              className="action-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                document.querySelector('.comments-section')?.scrollIntoView({ 
                  behavior: 'smooth',
                  block: 'start'
                });
              }}
            >
              <MessageCircle size={18} />
              {post.comments}
            </button>
            <button className="action-btn">
              <Share2 size={18} />
              {post.shares}
            </button>
            <button 
              className={`action-btn ${isBookmarked ? 'bookmarked' : ''}`}
              onClick={handleBookmark}
            >
              <Bookmark size={18} />
            </button>
          </div>
        </motion.div>

        {/* Comments Section */}
        <motion.div 
          id="comments"
          className="comments-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h3 className="comments-title">Comments ({comments.length})</h3>
          <p className="comments-subtitle">Share your thoughts and join the conversation!</p>
          
          {/* Add Comment Form */}
          <form onSubmit={handleCommentSubmit} className="add-comment-form">
            <img 
              src={currentUser?.photoURL || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'} 
              alt="Your avatar"
              className="comment-avatar"
            />
            <div className="comment-input-container">
              <input
                type="text"
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="comment-input"
              />
              <button type="submit" className="comment-submit-btn">
                <Send size={18} />
              </button>
            </div>
          </form>

          {/* Comments List */}
          <div className="comments-list">
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Comment Item Component
const CommentItem = ({ comment }) => {
  const { darkMode } = useDarkMode();
  const [isLiked, setIsLiked] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showReplyForm, setShowReplyForm] = useState(false);

  const handleLike = () => {
    setIsLiked(!isLiked);
  };

  const handleReplySubmit = (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    // Add reply logic here
    setReplyText('');
    setShowReplyForm(false);
  };

  return (
    <div className={`comment-item ${darkMode ? 'dark-mode' : ''}`}>
      <img 
        src={comment.author.avatar} 
        alt={comment.author.name}
        className="comment-avatar"
      />
      <div className="comment-content">
        <div className="comment-header">
          <span className="comment-author">
            {comment.author.name}
            {comment.author.verified && (
              <span className="verified-badge">✓</span>
            )}
          </span>
          <span className="comment-timestamp">{comment.timestamp}</span>
        </div>
        <p className="comment-text">{comment.content}</p>
        <div className="comment-actions">
          <button 
            className={`comment-action-btn ${isLiked ? 'liked' : ''}`}
            onClick={handleLike}
          >
            <Heart size={14} />
            {comment.likes}
          </button>
          <button 
            className="comment-action-btn"
            onClick={() => setShowReplyForm(!showReplyForm)}
          >
            Reply
          </button>
          {comment.replies.length > 0 && (
            <button 
              className="comment-action-btn"
              onClick={() => setShowReplies(!showReplies)}
            >
              {showReplies ? 'Hide' : 'Show'} {comment.replies.length} replies
            </button>
          )}
        </div>

        {/* Reply Form */}
        {showReplyForm && (
          <form onSubmit={handleReplySubmit} className="reply-form">
            <input
              type="text"
              placeholder="Write a reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="reply-input"
            />
            <button type="submit" className="reply-submit-btn">
              <Send size={16} />
            </button>
          </form>
        )}

        {/* Replies */}
        {showReplies && comment.replies.length > 0 && (
          <div className="replies">
            {comment.replies.map((reply) => (
              <div key={reply.id} className="reply-item">
                <img 
                  src={reply.author.avatar} 
                  alt={reply.author.name}
                  className="reply-avatar"
                />
                <div className="reply-content">
                  <div className="reply-header">
                    <span className="reply-author">
                      {reply.author.name}
                      {reply.author.verified && (
                        <span className="verified-badge">✓</span>
                      )}
                    </span>
                    <span className="reply-timestamp">{reply.timestamp}</span>
                  </div>
                  <p className="reply-text">{reply.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PostDetail;
