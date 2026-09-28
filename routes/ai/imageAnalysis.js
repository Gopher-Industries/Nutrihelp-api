const { authenticateAIToken } = require('../../middleware/authenticateAIToken');
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const predictionController = require('../../controller/imageClassificationController');
const gateway = require('../../services/imageClassificationGateway');
const { validateImageUpload, MAX_SIZE_BYTES, ALLOWED_MIME_TYPES } = require('../../validators/imageValidator');
const { validationError, fail, ok } = require('../../utils/apiResponse');
const { msg } = require('../../utils/messages');
const { buildImageScanPayload, SCAN_CONTRACT_VERSION } = require('../../services/scanContractService');
const logger = require('../../utils/logger');

const router = express.Router();

router.use(authenticateAIToken);

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) return cb(null, true);
    const err = new Error('invalid_mime');
    err.code = 'INVALID_MIME';
    return cb(err);
  },
});

function handleSingleUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return validationError(res, [{ field: 'file', message: msg('image.too_large') }]);
    if (err.code === 'INVALID_MIME') return validationError(res, [{ field: 'file', message: msg('image.invalid_type') }]);
    return fail(res, msg('image.no_file'), 400, 'UPLOAD_FAILED');
  });
}

// POST /ai-model/image-analysis/image-analysis
router.post('/image-analysis', handleSingleUpload, validateImageUpload, predictionController.predictImage);

// POST /ai-model/image-analysis/multi-image-analysis
router.post('/multi-image-analysis', (req, res, next) => {
  upload.array('files', 10)(req, res, (err) => {
    if (err && err.code === 'LIMIT_FILE_SIZE') return validationError(res, [{ field: 'files', message: msg('image.too_large') }]);
    if (err && err.code === 'INVALID_MIME') return validationError(res, [{ field: 'files', message: msg('image.invalid_type') }]);
    if (err) return fail(res, msg('image.no_file'), 400, 'UPLOAD_FAILED');
    next();
  });
}, async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return fail(res, msg('image.no_file'), 400, 'IMAGE_MISSING');
  }

  const predictions = [];

  for (const file of req.files) {
    try {
      const imageData = await fs.promises.readFile(file.path);
      const result = await gateway.classify(imageData);

      if (result.ok) {
        predictions.push({
          ok: true,
          classification: result.data.classification,
          explainability: result.data.explainability,
          imageName: file.originalname || null,
        });
      } else {
        predictions.push({
          ok: false,
          error: result.error || 'Classification failed',
          code: result.code || 'CLASSIFICATION_ERROR',
          imageName: file.originalname || null,
        });
      }
    } catch (err) {
      logger.error('Multi-image: failed to process file', { error: err.message, file: file.originalname });
      predictions.push({
        ok: false,
        error: 'Failed to process image',
        code: 'INTERNAL_ERROR',
        imageName: file.originalname || null,
      });
    } finally {
      fs.unlink(file.path, () => {});
    }
  }

  return res.json({ predictions });
});

module.exports = router;
