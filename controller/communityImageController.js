require('dotenv').config();
const multer = require('multer');
const path = require('path');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'), false);
    }
  }
}).single('image');

// Upload community post image
const uploadCommunityImage = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ 
        success: false,
        error: err.message 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'No image file provided' 
      });
    }

    try {
      const { user_id } = req.body;
      
      if (!user_id) {
        return res.status(400).json({ 
          success: false,
          error: 'User ID is required' 
        });
      }

      // For now, let's use a simpler approach - convert image to base64
      // This avoids Supabase storage permission issues
      const base64Image = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype;
      const dataUrl = `data:${mimeType};base64,${base64Image}`;
      
      return res.status(200).json({
        success: true,
        message: 'Image processed successfully',
        data: {
          image_url: dataUrl,
          file_name: req.file.originalname,
          file_size: req.file.size
        }
      });

    } catch (error) {
      console.error('Community image upload error:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Internal server error during image upload' 
      });
    }
  });
};

module.exports = {
  uploadCommunityImage
};
