const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { uploadLimiter } = require('../rateLimiter');
 
router.post('/upload', uploadLimiter, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  res.status(200).json({ message: 'File uploaded successfully', file: req.file });
});
 
module.exports = router;