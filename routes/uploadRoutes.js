const express = require('express');
const router = express.Router(); // 👈 define router first

const upload = require('../middleware/uploadMiddleware');
const { uploadLimiter } = require('../rateLimiter');

const { authenticateToken } = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');

// ✅ Only admins can upload
router.post(
  '/upload',
  authenticateToken,
  authorizeRoles('admin'), // 👈 use role name, not ID
  uploadLimiter,
  upload.single('file'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    res.status(200).json({ message: 'File uploaded successfully', file: req.file });
  }
);

module.exports = router;
