const express = require('express');
const predictionController = require('../controller/recipeImageClassificationController.js');
const { validateRecipeImageUpload } = require('../validators/recipeImageValidator.js');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Ensure uploads directory exists
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads', { recursive: true });
}

// Create temp directory for uploads
if (!fs.existsSync('./uploads/temp')) {
  fs.mkdirSync('./uploads/temp', { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/temp/');  
  },
  filename: function (req, file, cb) {
    const uniquePrefix = Date.now() + '-';
    cb(null, uniquePrefix + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
    cb(null, true);
  } else {
    cb(new Error('Only JPG and PNG image files are allowed'), false);
  }
};

// Initialize multer upload middleware
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  }
});

// Define route for receiving input data and returning predictions
router.post(
  '/',
  upload.single('image'),
  validateRecipeImageUpload,  // 👈 validate image file
  predictionController.predictRecipeImage
);

// Error handling middleware
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds 5MB limit' });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

module.exports = router;