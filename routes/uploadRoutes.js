const express = require('express');
const router = express.Router();   // 👈 define router first

const upload = require('../middleware/uploadMiddleware');
const { uploadLimiter } = require('../rateLimiter');

const { authenticateToken } = require("../middleware/authenticateToken");
const authorizeRoles = require('../middleware/authorizeRoles');
const {
  createBlockMiddleware,
  registerUploadAbuse,
} = require('../services/securityEvents/securityResponseService');

const secureUploadSingle = (fieldName) => {
  const uploadSingle = upload.single(fieldName);

  return async (req, res, next) => {
    uploadSingle(req, res, async (error) => {
      if (error) {
        await registerUploadAbuse(req, {
          reason: 'UPLOAD_VALIDATION_FAILED',
          message: error.message,
        });
        return res.status(400).json({
          success: false,
          message: error.message,
          code: 'UPLOAD_VALIDATION_FAILED',
        });
      }

      return next();
    });
  };
};

// ✅ Only admins can upload
router.post(
  '/upload',
  createBlockMiddleware(),
  authenticateToken,
  authorizeRoles("admin"),   // 👈 use role name, not ID
  uploadLimiter,
  secureUploadSingle('file'),
  async (req, res) => {
    if (!req.file) {
      await registerUploadAbuse(req, {
        reason: 'UPLOAD_FILE_MISSING',
      });
      return res.status(400).json({ message: 'No file uploaded' });
    }
    res.status(200).json({ message: 'File uploaded successfully', file: req.file });
  }
);

module.exports = router;
