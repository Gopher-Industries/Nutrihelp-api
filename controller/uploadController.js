const multer = require('multer');
const logger = require('../utils/logger');
const { supabaseService: supabase } = require('../services/supabaseClient');
const crypto = require('crypto');
const path = require('path');
const { fileTypeFromBuffer } = require('file-type');

// Single source of truth for allowed file types — used by both
// the initial mimetype check (fileFilter) and the real content check (uploadFile)
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },

  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'), false);
    }
  }
}).single('file');

/**
 * Improve Upload Audit Logging
 *
 * Writes one row to upload_logs for every upload attempt — not just successes —
 * so the audit trail can answer "who tried to upload what, when, and did it work."
 * A logging failure here must never break the actual upload response, so this
 * is intentionally fire-and-forget with its own error handling.
 */
async function logUploadAttempt({
  req,
  status,
  originalFilename = null,
  storedPath = null,
  fileSizeBytes = null,
  mimeType = null,
  errorReason = null
}) {
  const user_id = req.user?.userId ?? null;

  try {
    const { error: logError } = await supabase.from('upload_logs').insert([
      {
        user_id,
        status,
        original_filename: originalFilename,
        stored_path: storedPath,
        file_size_bytes: fileSizeBytes,
        mime_type: mimeType,
        error_reason: errorReason,
        ip_address: req.ip || req.headers['x-forwarded-for'] || null
      }
    ]);

    if (logError) {
      // Don't throw — a broken audit log must not take down the upload endpoint.
      logger.warn('Failed to write upload audit log', {
        error: logError.message,
        userId: user_id,
        status
      });
    }
  } catch (error) {
    logger.warn('Unexpected error writing upload audit log', {
      error: error.message,
      userId: user_id,
      status
    });
  }

  // Mirror every audit event to the application log too, so it shows up in
  // operational monitoring/alerting, not just the database table.
  const logPayload = { userId: user_id, status, originalFilename, mimeType, errorReason };
  if (status === 'success') {
    logger.info('Upload attempt', logPayload);
  } else {
    logger.warn('Upload attempt', logPayload);
  }
}

exports.uploadFile = (req, res) => {
  // multer's upload() is callback-based. Wrapping it in a Promise means callers
  // (and tests) that `await uploadFile(req, res)` genuinely wait for the whole
  // request/response cycle to finish, not just for multer to start parsing.
  return new Promise((resolve) => {
    upload(req, res, async (err) => {
      if (err) {
        // multer's own errors: bad declared mimetype (fileFilter) or file too large (limits).
        const isSizeError = err.code === 'LIMIT_FILE_SIZE';
        await logUploadAttempt({
          req,
          status: isSizeError ? 'rejected_size' : 'rejected_type',
          originalFilename: req.file?.originalname || null,
          fileSizeBytes: req.file?.size || null,
          mimeType: req.file?.mimetype || null,
          errorReason: err.message
        });

        resolve(res.status(400).json({
          success: false,
          error: err.message
        }));
        return;
      }

      if (!req.file) {
        await logUploadAttempt({
          req,
          status: 'error',
          errorReason: 'No file uploaded'
        });

        resolve(res.status(400).json({
          success: false,
          error: 'No file uploaded'
        }));
        return;
      }

      const user_id = req.user.userId;
      const file = req.file;

      const detectedType = await fileTypeFromBuffer(file.buffer);

      if (!detectedType || !ALLOWED_TYPES.includes(detectedType.mime)) {
        await logUploadAttempt({
          req,
          status: 'rejected_type',
          originalFilename: file.originalname,
          fileSizeBytes: file.size,
          mimeType: file.mimetype,
          errorReason: 'File content does not match an allowed file type (jpeg, png, or pdf).'
        });

        resolve(res.status(400).json({
          success: false,
          error: 'File content does not match an allowed file type (jpeg, png, or pdf).'
        }));
        return;
      }

      if (detectedType.mime !== file.mimetype) {
        await logUploadAttempt({
          req,
          status: 'rejected_type',
          originalFilename: file.originalname,
          fileSizeBytes: file.size,
          mimeType: file.mimetype,
          errorReason: `Declared type (${file.mimetype}) did not match actual content (${detectedType.mime}).`
        });

        resolve(res.status(400).json({
          success: false,
          error: 'Declared file type does not match actual file content.'
        }));
        return;
      }

      // --- Task 4: sanitize filename before it touches storage ---
      const safeName = crypto.randomBytes(16).toString('hex');
      const ext = path.extname(file.originalname).toLowerCase();
      const filePath = `files/${user_id}/${safeName}${ext}`;

      try {
        const { error: uploadError } = await supabase.storage
          .from('uploads')
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            cacheControl: '3600',
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: urlData, error: urlError } = supabase.storage
          .from('uploads')
          .getPublicUrl(filePath);

        if (urlError || !urlData) {
          throw urlError || new Error('Failed to generate file URL');
        }

        const fileUrl = urlData.publicUrl;

        await logUploadAttempt({
          req,
          status: 'success',
          originalFilename: file.originalname,
          storedPath: filePath,
          fileSizeBytes: file.size,
          mimeType: file.mimetype
        });

        resolve(res.status(201).json({
          success: true,
          message: 'File uploaded successfully',
          fileUrl
        }));

      } catch (error) {
        await logUploadAttempt({
          req,
          status: 'error',
          originalFilename: file.originalname,
          fileSizeBytes: file.size,
          mimeType: file.mimetype,
          errorReason: error.message
        });

        logger.error('File upload failed', {
          error: error.message,
          userId: req.user?.userId
        });

        resolve(res.status(500).json({
          success: false,
          error: 'File upload failed'
        }));
      }
    });
  });
};

// Exported for tests only.
exports._testInternals = { ALLOWED_TYPES, MAX_FILE_SIZE_BYTES, logUploadAttempt };