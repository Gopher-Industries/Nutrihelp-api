/**
 * imageValidator.js
 *
 * Upload middleware that runs AFTER multer and BEFORE the controller.  It
 * returns safe, typed validation errors using the shared apiResponse helper
 * so that every failure on the image-classification endpoint shares one
 * { success: false, error, code, errors[] } shape.
 *
 * If the file fails validation we also remove the bytes from disk so a
 * rejected upload can never linger in the uploads directory.
 */

const fs = require('fs');
const path = require('path');
const { validationError, fail } = require('../utils/apiResponse');
const { msg } = require('../utils/messages');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

function safeDelete(filePath) {
  if (!filePath) return;
  fs.unlink(filePath, () => {
    /* best-effort cleanup; logged elsewhere */
  });
}

const validateImageUpload = (req, res, next) => {
  const file = req.file;

  if (!file) {
    return fail(res, msg('image.no_file'), 400, 'IMAGE_MISSING');
  }

  const errors = [];

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    errors.push({ field: 'image', message: msg('image.invalid_type') });
  }

  const extension = path.extname(file.originalname || '').toLowerCase();
  if (extension && !ALLOWED_EXTENSIONS.includes(extension)) {
    errors.push({ field: 'image', message: msg('image.invalid_type') });
  }

  if (typeof file.size === 'number' && file.size > MAX_SIZE_BYTES) {
    errors.push({ field: 'image', message: msg('image.too_large') });
  }

  if (errors.length > 0) {
    safeDelete(file.path);
    return validationError(res, errors);
  }

  next();
};

module.exports = {
  validateImageUpload,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_SIZE_BYTES,
};
