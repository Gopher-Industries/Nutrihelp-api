const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { uploadLimiter } = require('../rateLimiter');

const authenticateToken = require('../middleware/authenticateToken'); // ensures JWT is valid
const authorizeRoles = require('../middleware/authorizeRoles');

// ✅ Only admins can upload
router.post(
  '/upload',
  authenticateToken,
  authorizeRoles(9), // role_id = 9 is admin
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