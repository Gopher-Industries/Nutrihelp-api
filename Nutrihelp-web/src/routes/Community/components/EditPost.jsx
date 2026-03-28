import React, { useState, useContext } from 'react';
import { UserContext } from '../../../context/user.context';
import { useDarkMode } from '../../DarkModeToggle/DarkModeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Image as ImageIcon, 
  Hash, 
  Save,
  AlertCircle
} from 'lucide-react';
import './EditPost.css';

const EditPost = ({ isOpen, onClose, post, onPostUpdated }) => {
  const { currentUser } = useContext(UserContext);
  const { darkMode } = useDarkMode();
  
  const [formData, setFormData] = useState({
    content: post?.content || '',
    category: post?.category || 'nutrition-tips',
    tags: post?.tags ? post.tags.join(', ') : '',
    image: null
  });
  
  const [imagePreview, setImagePreview] = useState(post?.image || null);
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

  React.useEffect(() => {
    if (post) {
      setFormData({
        content: post.content || '',
        category: post.category || 'nutrition-tips',
        tags: post.tags ? post.tags.join(', ') : '',
        image: null
      });
      setImagePreview(post.image || null);
      setErrors({});
    }
  }, [post]);

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
      
      // Create updated post object
      const updatedPost = {
        ...post,
        content: formData.content,
        image: imagePreview,
        category: formData.category,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : [],
        updatedAt: new Date().toISOString()
      };
      
      // Call parent callback
      onPostUpdated(updatedPost);
      
      // Close modal
      onClose();
      
    } catch (error) {
      console.error('Error updating post:', error);
      setErrors(prev => ({
        ...prev,
        submit: 'Failed to update post. Please try again.'
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

  if (!post) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="edit-post-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className={`edit-post-modal ${darkMode ? 'dark-mode' : ''}`}
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header">
              <h2 className="modal-title">Edit Post</h2>
              <button 
                className="close-btn"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                <X size={24} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="edit-post-form">
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
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Update Post
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

export default EditPost;
