const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const recipeImageClassificationController = require('../controllers/recipeImageClassificationController');

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, 'image.jpg');
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function(req, file, cb) {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
  }
});

// Recipe Classification Route
router.post('/classify', upload.single('photo'), recipeImageClassificationController);

router.use('/classify', (err, req, res, next) => {
  console.error('Error in classification route:', err);
  res.status(500).json({ 
    success: false, 
    message: 'An error occurred during image classification',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

module.exports = router; 