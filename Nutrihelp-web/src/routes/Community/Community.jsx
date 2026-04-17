// Community.jsx
import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../../context/user.context';
import { useDarkMode } from '../DarkModeToggle/DarkModeContext';
import { motion } from 'framer-motion';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Search,
  Plus,
  Users,
  TrendingUp,
  Star,
  Hash
} from 'lucide-react';
import CreatePost from './components/CreatePost';
import ImageModal from './components/ImageModal';
import EditPost from './components/EditPost';
import './Community.css';

const Community = () => {
  const { currentUser } = useContext(UserContext);
  const { darkMode } = useDarkMode();

  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [searchHistory, setSearchHistory] = useState([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageList, setImageList] = useState([]);
  const [showEditPost, setShowEditPost] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  const loadPosts = () => {
    const savedPosts = localStorage.getItem('community_posts');
    if (savedPosts) return JSON.parse(savedPosts);

    return [
      {
        id: 1,
        author: {
          id: 'sarah_johnson',
          name: 'Sarah Johnson',
          avatar:
            'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
          verified: true
        },
        content:
          'Just completed my first 30-day healthy eating challenge! The key was meal prepping on Sundays and having healthy snacks ready. Lost 8 pounds and feel so much more energetic. Anyone else doing similar challenges?',
        image:
          'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&h=300&fit=crop',
        category: 'weight-loss',
        likes: 124,
        comments: 23,
        shares: 8,
        timestamp: '2 hours ago',
        tags: ['#weight-loss', '#meal-prep', '#healthy-eating']
      },
      {
        id: 2,
        author: {
          id: 'mike_chen',
          name: 'Mike Chen',
          avatar:
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
          verified: false
        },
        content:
          "Found this amazing protein smoothie recipe that's perfect for post-workout recovery. 25g protein, low sugar, and tastes amazing! Recipe in comments",
        image:
          'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=500&h=300&fit=crop',
        category: 'fitness',
        likes: 89,
        comments: 15,
        shares: 12,
        timestamp: '5 hours ago',
        tags: ['#protein', '#smoothie', '#post-workout']
      },
      {
        id: 3,
        author: {
          id: 'emma_davis',
          name: 'Emma Davis',
          avatar:
            'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
          verified: true
        },
        content:
          "Struggling with gluten sensitivity? Here are my top 5 gluten-free alternatives that actually taste good! Quinoa pasta, almond flour, and more. What's your favorite gluten-free substitute?",
        image:
          'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500&h=300&fit=crop',
        category: 'dietary-restrictions',
        likes: 67,
        comments: 31,
        shares: 5,
        timestamp: '1 day ago',
        tags: ['#gluten-free', '#dietary-restrictions', '#healthy-alternatives']
      },
      {
        id: 4,
        author: {
          id: 'alex_rodriguez',
          name: 'Alex Rodriguez',
          avatar:
            'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
          verified: false
        },
        content:
          'Meal prep Sunday success! Prepped 20 meals in 2 hours. Pro tip: invest in good quality containers and prep your proteins first. This week: grilled chicken, roasted veggies, and quinoa bowls.',
        image:
          'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&h=300&fit=crop',
        category: 'meal-prep',
        likes: 156,
        comments: 42,
        shares: 18,
        timestamp: '2 days ago',
        tags: ['#meal-prep', '#sunday-prep', '#healthy-meals']
      },
      {
        id: 5,
        author: {
          id: 'dr_lisa_park',
          name: 'Dr. Lisa Park',
          avatar:
            'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face',
          verified: true
        },
        content:
          'Quick nutrition tip: Did you know that pairing vitamin C-rich foods with iron-rich foods can increase iron absorption by up to 6x? Try adding bell peppers to your spinach salad!',
        category: 'nutrition-tips',
        likes: 203,
        comments: 28,
        shares: 35,
        timestamp: '3 days ago',
        tags: ['#nutrition-tips', '#vitamin-c', '#iron-absorption']
      }
    ];
  };

  const categories = [
    { id: 'all', name: 'All Posts', icon: '📋' },
    { id: 'weight-loss', name: 'Weight Loss', icon: '⚖️' },
    { id: 'fitness', name: 'Fitness', icon: '💪' },
    { id: 'dietary-restrictions', name: 'Dietary Restrictions', icon: '🥗' },
    { id: 'meal-prep', name: 'Meal Prep', icon: '🍳' },
    { id: 'nutrition-tips', name: 'Nutrition Tips', icon: '💡' }
  ];

  useEffect(() => {
    setPosts(loadPosts());
  }, []);

  useEffect(() => {
    localStorage.setItem('community_posts', JSON.stringify(posts));
  }, [posts]);

  const handleCreatePost = () => setShowCreatePost(true);

  const handlePostCreated = (newPost) => {
    const postWithUser = {
      ...newPost,
      author: {
        ...newPost.author,
        id: currentUser?.uid || 'anonymous_user'
      }
    };
    setPosts((prev) => [postWithUser, ...prev]);
  };

  const handleLike = (postId, shouldLike) => {
  setPosts(prevPosts =>
    prevPosts.map(post =>
      post.id === postId
        ? { ...post, likes: Math.max(0, post.likes + (shouldLike ? 1 : -1)) }
        : post
    )
  );
};


  const handleImageClick = (imageUrl) => {
    const allImages = posts.filter((p) => p.image).map((p) => p.image);
    const imageIndex = allImages.findIndex((img) => img === imageUrl);

    setImageList(allImages);
    setSelectedImageIndex(imageIndex >= 0 ? imageIndex : 0);
    setShowImageModal(true);
  };

  const handleEditPost = (post) => {
    setEditingPost(post);
    setShowEditPost(true);
  };

  const handleDeletePost = (postId) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    }
  };

  const handlePostUpdated = (updatedPost) => {
    setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
    setShowEditPost(false);
    setEditingPost(null);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowSearchSuggestions(value.length > 0);
  };

  const handleSearchSubmit = (query) => {
    setSearchQuery(query);
    setShowSearchSuggestions(false);

    if (query.trim() && !searchHistory.includes(query.trim())) {
      setSearchHistory((prev) => [query.trim(), ...prev.slice(0, 4)]);
    }
  };

  const filteredPosts = posts
    .filter((post) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        post.content.toLowerCase().includes(q) ||
        post.author.name.toLowerCase().includes(q) ||
        (post.tags || []).some((tag) => tag.toLowerCase().includes(q));

      const matchesCategory = activeTab === 'all' || post.category === activeTab;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      // NOTE: your timestamps are strings like "2 hours ago" so Date(...) won't work reliably.
      // Keeping your original sort options but defaulting to stable fallback.
      switch (sortBy) {
        case 'most-liked':
          return (b.likes || 0) - (a.likes || 0);
        case 'most-commented':
          return (b.comments || 0) - (a.comments || 0);
        case 'most-shared':
          return (b.shares || 0) - (a.shares || 0);
        default:
          return 0;
      }
    });

  return (
    <div className={`community-page ${darkMode ? 'dark-mode' : ''}`}>
      <div className="community-container">
        {/* Header Section */}
        <motion.div
          className="community-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="header-content">
            <h1 className="community-title">Health Community</h1>
            <p className="community-subtitle">
              Share your health journey, discover tips, and connect with like-minded people
            </p>
          </div>

          <button className="create-post-btn" onClick={handleCreatePost}>
            <Plus size={20} />
            Share Experience
          </button>
        </motion.div>

        {/* Stats Section */}
        <motion.div
          className="community-stats"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="stat-item">
            <Users size={32} />
            <div className="stat-number">2.4K</div>
            <div className="stat-label">Members</div>
          </div>
          <div className="stat-item">
            <TrendingUp size={32} />
            <div className="stat-number">156</div>
            <div className="stat-label">Posts Today</div>
          </div>
          <div className="stat-item">
            <Star size={32} />
            <div className="stat-number">89</div>
            <div className="stat-label">Top Contributors</div>
          </div>
        </motion.div>

        {/* Search and Filter Section */}
        <motion.div
          className="search-filter-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="search-container">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Search posts, people, or topics..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => setShowSearchSuggestions(searchQuery.length > 0)}
              onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
              className="search-input"
            />

            {showSearchSuggestions && (
              <div className="search-suggestions">
                {searchHistory.length > 0 && (
                  <div className="suggestion-section">
                    <div className="suggestion-title">Recent searches</div>
                    {searchHistory.map((term, index) => (
                      <button
                        key={index}
                        className="suggestion-item"
                        onClick={() => handleSearchSubmit(term)}
                        type="button"
                      >
                        <Search size={14} />
                        {term}
                      </button>
                    ))}
                  </div>
                )}

                <div className="suggestion-section">
                  <div className="suggestion-title">Popular tags</div>
                  {['#weight-loss', '#meal-prep', '#healthy-eating', '#fitness', '#nutrition-tips'].map(
                    (tag, index) => (
                      <button
                        key={index}
                        className="suggestion-item"
                        onClick={() => handleSearchSubmit(tag)}
                        type="button"
                      >
                        <Hash size={14} />
                        {tag}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="filter-container">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="filter-select"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sort-container">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
              <option value="newest">🕒 Newest</option>
              <option value="oldest">⏰ Oldest</option>
              <option value="most-liked">❤️ Most Liked</option>
              <option value="most-commented">💬 Most Commented</option>
              <option value="most-shared">📤 Most Shared</option>
            </select>
          </div>
        </motion.div>

        {/* Category Tabs */}
        <motion.div
          className="category-tabs"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          {categories.map((category) => (
            <button
              key={category.id}
              className={`category-tab ${activeTab === category.id ? 'active' : ''}`}
              onClick={() => setActiveTab(category.id)}
              type="button"
            >
              <span className="category-icon">{category.icon}</span>
              <span className="category-name">{category.name}</span>
            </button>
          ))}
        </motion.div>

        {/* Posts Section */}
        <motion.div
          className="posts-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          {isLoading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading community posts...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="no-posts">
              <p>No posts found. Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className="posts-grid">
              {filteredPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={handleLike}
                  onImageClick={handleImageClick}
                  onEdit={handleEditPost}
                  onDelete={handleDeletePost}
                  currentUser={currentUser}
                />
              ))}
            </div>
          )}
        </motion.div>
      </div>

      <CreatePost
        isOpen={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        onPostCreated={handlePostCreated}
      />

      <ImageModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        images={imageList}
        currentIndex={selectedImageIndex}
      />

      <EditPost
        isOpen={showEditPost}
        onClose={() => {
          setShowEditPost(false);
          setEditingPost(null);
        }}
        post={editingPost}
        onPostUpdated={handlePostUpdated}
      />
    </div>
  );
};

const PostCard = ({ post, onLike, onImageClick, onEdit, onDelete, currentUser }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

 const handleLikeClick = (e) => {
  e.preventDefault();
  e.stopPropagation();

  setIsLiked((prev) => {
    const next = !prev;
    onLike(post.id, next); 
    return next;
  });
};


  const handleBookmarkClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsBookmarked((v) => !v);
  };

  const handleImageClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onImageClick) onImageClick(post.image);
  };

  const handleEditClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onEdit) onEdit(post);
  };

  const handleDeleteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) onDelete(post.id);
  };

  const handleCardClick = () => {
    window.location.href = `/community/post/${post.id}`;
  };

  const handleCommentClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.location.href = `/community/post/${post.id}#comments`;
  };

  const handleShareClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const url = window.location.origin + `/community/post/${post.id}`;

    if (navigator.share) {
      navigator.share({
        title: 'Check out this post on NutriHelp Community',
        text: (post.content || '').substring(0, 100) + '...',
        url
      });
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  const isOwner =
    currentUser && (currentUser.uid === post.author.id || currentUser.displayName === post.author.name);

  const getCategoryClass = (category) => {
    const categoryClasses = {
      'weight-loss': 'category-weight-loss',
      fitness: 'category-fitness',
      'dietary-restrictions': 'category-dietary-restrictions',
      'meal-prep': 'category-meal-prep',
      'nutrition-tips': 'category-nutrition-tips'
    };
    return categoryClasses[category] || 'category-weight-loss';
  };

  return (
    <motion.div
      className="post-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={handleCardClick}
    >
      <div className="post-header">
        <div className="author-info">
          <img src={post.author.avatar} alt={post.author.name} className="author-avatar" />
          <div className="author-details">
            <div className="author-name">
              {post.author.name}
              {post.author.verified && <span className="verified-badge">✓</span>}
            </div>
            <div className="post-timestamp">{post.timestamp}</div>
          </div>
        </div>

        <div className="post-category">
          <span className={`category-badge ${getCategoryClass(post.category)}`}>
            {post.category.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
          </span>

          {isOwner && (
            <div className="post-owner-actions">
              <button className="action-btn edit-btn" onClick={handleEditClick} title="Edit post" type="button">
                ✏️
              </button>
              <button className="action-btn delete-btn" onClick={handleDeleteClick} title="Delete post" type="button">
                🗑️
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="post-content">
        <p className="post-text">{post.content}</p>

        {post.image && (
          <img
            src={post.image}
            alt="Post content"
            className="post-image"
            onClick={handleImageClick}
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

      <div className="post-actions">
        <button className={`action-btn ${isLiked ? 'liked' : ''}`} onClick={handleLikeClick} type="button">
          <Heart size={18} />
          {post.likes}
        </button>

        <button className="action-btn" onClick={handleCommentClick} type="button">
          <MessageCircle size={18} />
          {post.comments}
        </button>

        <button className="action-btn" onClick={handleShareClick} type="button">
          <Share2 size={18} />
          {post.shares}
        </button>

       <button className={`action-btn bookmark-btn ${isBookmarked ? 'bookmarked' : ''}`} onClick={handleBookmarkClick} type="button">
       <Bookmark size={18} fill={isBookmarked ? "currentColor" : "none"} />
       </button>
      </div>
    </motion.div>
  );
};

export default Community;
