const { body, validationResult } = require('express-validator');
const path = require('path');

// Middleware to validate uploaded image
const validateRecipeImageUpload = (req, res, next) => {
  // Check if file is present
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }

  // Validate file extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png'];
  const fileExtension = path.extname(req.file.originalname).toLowerCase();

  if (!allowedExtensions.includes(fileExtension)) {
    return res.status(400).json({ error: 'Invalid file type. Only JPG/PNG files are allowed.' });
  }

  next();
};

module.exports = {
  validateRecipeImageUpload,
};
