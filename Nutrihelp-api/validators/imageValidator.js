const path = require('path');

// Middleware to validate uploaded image for image classification
const validateImageUpload = (req, res, next) => {
  const file = req.file;

  // Check if file was uploaded
  if (!file) {
    return res.status(400).json({ error: 'No image uploaded. Please upload a JPEG or PNG image.' });
  }

  // Check MIME type
  const allowedTypes = ['image/jpeg', 'image/png'];
  if (!allowedTypes.includes(file.mimetype)) {
    return res.status(400).json({ error: 'Invalid file type. Only JPEG and PNG images are allowed.' });
  }

  // Check file size limit (e.g., 5MB)
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size > MAX_SIZE) {
    return res.status(400).json({ error: 'Image size exceeds 5MB limit.' });
  }

  next(); // Validation passed, continue
};

module.exports = {
  validateImageUpload,
};
