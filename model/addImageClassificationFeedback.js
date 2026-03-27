const fs = require("fs");
const path = require("path");
const feedbackRepository = require("../repositories/feedbackRepository");

/**
 * Stores image classification feedback in Supabase
 * 
 * @param {string} user_id - User ID (optional)
 * @param {string} image_path - Path to the image file
 * @param {string} predicted_class - The class predicted by the system
 * @param {string} correct_class - The correct class according to user
 * @param {object} metadata - Additional metadata (optional)
 * @returns {Promise} Supabase response
 */
async function addImageClassificationFeedback(
  user_id,
  image_path,
  predicted_class,
  correct_class,
  metadata = {}
) {
  try {
    const filename = path.basename(image_path);
    let image_data = null;
    let image_type = null;
    
    if (fs.existsSync(image_path)) {
      const fileBuffer = fs.readFileSync(image_path);
      image_data = fileBuffer.toString('base64');
      
      const ext = path.extname(image_path).toLowerCase();
      if (ext === '.jpg' || ext === '.jpeg') {
        image_type = 'image/jpeg';
      } else if (ext === '.png') {
        image_type = 'image/png';
      } else {
        image_type = 'application/octet-stream';
      }
    }
    
    const timestamp = new Date().toISOString();
    
    return await feedbackRepository.createImageClassificationFeedback({
      user_id: user_id || null,
      filename,
      image_data,
      image_type,
      predicted_class,
      correct_class,
      metadata,
      created_at: timestamp
    });
  } catch (error) {
    console.error("Failed to store image classification feedback:", error);
    throw error;
  }
}

module.exports = addImageClassificationFeedback; 
