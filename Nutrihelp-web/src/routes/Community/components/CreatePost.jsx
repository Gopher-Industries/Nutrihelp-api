import React, { useState, useContext } from 'react';
import { UserContext } from '../../../context/user.context';
import { useDarkMode } from '../../DarkModeToggle/DarkModeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Image as ImageIcon, 
  Hash, 
  Send,
  AlertCircle
} from 'lucide-react';
import './CreatePost.css';

const CreatePost = ({ isOpen, onClose, onPostCreated }) => {
  const { currentUser } = useContext(UserContext);
  const { darkMode } = useDarkMode();
  
  const [formData, setFormData] = useState({
    content: '',
    category: 'nutrition-tips',
    tags: '',
    image: null
  });
  
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const categories = [
    { id: 'weight-loss', name: 'Weight Loss', icon: '⚖️' },
    { id: 'fitness', name: 'Fitness', icon: '💪' },
    { id: 'dietary-restrictions', name: 'Dietary Restrictions', icon: '🥗' },
    { id: 'meal-prep', name: 'Meal Prep', icon: '🍳' },
    { id: 'nutrition-tips', name: 'Nutrition Tips', icon: '💡' },
    { id: 'success-story', name: 'Success Story', icon: '🏆' },
    { id: 'recipe-share', name: 'Recipe Share', icon: '👨‍🍳' },
    { id: 'motivation', name: 'Motivation', icon: '🔥' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setErrors(prev => ({
          ...prev,
          image: 'Image size should be less than 5MB'
        }));
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({
          ...prev,
          image: 'Please select a valid image file'
        }));
        return;
      }
      
      setFormData(prev => ({
        ...prev,
        image: file
      }));
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
      
      // Clear image error
      if (errors.image) {
        setErrors(prev => ({
          ...prev,
          image: ''
        }));
      }
    }
  };

  const removeImage = () => {
    setFormData(prev => ({
      ...prev,
      image: null
    }));
    setImagePreview(null);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.content.trim()) {
      newErrors.content = 'Please write something to share';
    } else if (formData.content.length < 10) {
      newErrors.content = 'Post content should be at least 10 characters long';
    }
    
    if (!formData.category) {
      newErrors.category = 'Please select a category';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Create new post object
      const newPost = {
        id: Date.now(),
        author: {
          id: currentUser?.uid || 'anonymous_user',
          name: currentUser?.displayName || 'Anonymous User',
          avatar: currentUser?.photoURL || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
          verified: false
        },
        content: formData.content,
        image: imagePreview,
        category: formData.category,
        likes: 0,
        comments: 0,
        shares: 0,
        timestamp: 'Just now',
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : []
      };
      
      // Call parent callback
      onPostCreated(newPost);
      
      // Reset form
      setFormData({
        content: '',
        category: 'nutrition-tips',
        tags: '',
        image: null
      });
      setImagePreview(null);
      setErrors({});
      
      // Close modal
      onClose();
      
    } catch (error) {
      console.error('Error creating post:', error);
      setErrors(prev => ({
        ...prev,
        submit: 'Failed to create post. Please try again.'
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="create-post-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className={`create-post-modal ${darkMode ? 'dark-mode' : ''}`}
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header">
              <h2 className="modal-title">Share Your Experience</h2>
              <button 
                className="close-btn"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                <X size={24} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="create-post-form">
              {/* Content Input */}
              <div className="form-group">
                <label htmlFor="content" className="form-label">
                  What would you like to share?
                </label>
                <textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  placeholder="Share your health journey, tips, recipes, or motivation with the community..."
                  className={`form-textarea ${errors.content ? 'error' : ''}`}
                  rows={6}
                  maxLength={1000}
                />
                {errors.content && (
                  <div className="error-message">
                    <AlertCircle size={16} />
                    {errors.content}
                  </div>
                )}
                <div className="character-count">
                  {formData.content.length}/1000
                </div>
              </div>

              {/* Category Selection */}
              <div className="form-group">
                <label htmlFor="category" className="form-label">
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className={`form-select ${errors.category ? 'error' : ''}`}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <div className="error-message">
                    <AlertCircle size={16} />
                    {errors.category}
                  </div>
                )}
              </div>

              {/* Tags Input */}
              <div className="form-group">
                <label htmlFor="tags" className="form-label">
                  Tags (optional)
                </label>
                <div className="tags-input-container">
                  <Hash size={20} className="tags-icon" />
                  <input
                    type="text"
                    id="tags"
                    name="tags"
                    value={formData.tags}
                    onChange={handleInputChange}
                    placeholder="Add tags separated by commas (e.g., weight-loss, healthy-eating, motivation)"
                    className="form-input"
                    maxLength={200}
                  />
                </div>
                <div className="tags-help">
                  Tags help others discover your post
                </div>
              </div>

              {/* Image Upload */}
              <div className="form-group">
                <label className="form-label">
                  Add Image (optional)
                </label>
                <div className="image-upload-container">
                  {imagePreview ? (
                    <div className="image-preview">
                      <img src={imagePreview} alt="Preview" />
                      <button
                        type="button"
                        className="remove-image-btn"
                        onClick={removeImage}
                      >
                        <X size={20} />
                      </button>
                    </div>
                  ) : (
                    <label className="image-upload-label">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="image-input"
                      />
                      <div className="upload-placeholder">
                        <ImageIcon size={40} />
                        <span>Click to upload image</span>
                        <small>Max size: 5MB</small>
                      </div>
                    </label>
                  )}
                </div>
                {errors.image && (
                  <div className="error-message">
                    <AlertCircle size={16} />
                    {errors.image}
                  </div>
                )}
              </div>

              {/* Submit Error */}
              {errors.submit && (
                <div className="error-message submit-error">
                  <AlertCircle size={16} />
                  {errors.submit}
                </div>
              )}

              {/* Action Buttons */}
              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="loading-spinner"></div>
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      Share Post
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CreatePost;

