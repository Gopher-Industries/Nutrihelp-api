const path = require('path');
const { validationError } = require('../utils/apiResponse');

// Middleware to validate uploaded image
const validateRecipeImageUpload = (req, res, next) => {
  // Check if file is present
  if (!req.file) {
    return validationError(res, [
      { field: 'image', message: 'No image uploaded' },
    ]);
  }

  // Validate file extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png'];
  const fileExtension = path.extname(req.file.originalname).toLowerCase();

  if (!allowedExtensions.includes(fileExtension)) {
    return validationError(res, [
      { field: 'image', message: 'Invalid file type. Only JPG/PNG files are allowed.' },
    ]);
  }

  next();
};

module.exports = {
  validateRecipeImageUpload,
};
