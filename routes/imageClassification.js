/**
 * routes/imageClassification.js
 *
 * Single POST entry point for the image-classification gateway.
 * Pipeline:
 *   multer upload → validator → controller (which delegates to the gateway)
 *
 * Multer is configured with tight limits and a MIME-type filter so bad
 * uploads are rejected before they ever hit the filesystem.  Any rejection
 * is translated into the shared validation-error envelope.
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const predictionController = require('../controller/imageClassificationController.js');
const { validateImageUpload, MAX_SIZE_BYTES, ALLOWED_MIME_TYPES } =
  require('../validators/imageValidator.js');
const { validationError, fail } = require('../utils/apiResponse');
const { msg } = require('../utils/messages');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: MAX_SIZE_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(null, true);
    }
    // Reject without throwing so the error handler below can turn it into a
    // consistent validation error.
    const err = new Error('invalid_mime');
    err.code = 'INVALID_MIME';
    return cb(err);
  },
});

function handleUpload(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (!err) return next();

    if (err.code === 'LIMIT_FILE_SIZE') {
      return validationError(res, [
        { field: 'image', message: msg('image.too_large') },
      ]);
    }
    if (err.code === 'INVALID_MIME') {
      return validationError(res, [
        { field: 'image', message: msg('image.invalid_type') },
      ]);
    }
    return fail(res, msg('image.no_file'), 400, 'UPLOAD_FAILED');
  });
}

router.post('/', handleUpload, validateImageUpload, predictionController.predictImage);

module.exports = router;
