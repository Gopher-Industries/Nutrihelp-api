/**
 * imageClassificationController.js
 *
 * Thin controller — all orchestration lives in the classification gateway.
 * This file is intentionally small and does three things:
 *
 *   1. Validate that an upload exists on `req.file`.
 *   2. Hand the image bytes to the gateway.
 *   3. Translate the gateway's normalised result into an HTTP response using
 *      the shared { success, data, error, code } envelope.
 *
 * The gateway is responsible for AI-vs-fallback selection, uncertainty
 * flagging, circuit-breaker coordination, and populating explainability
 * metadata.  See services/imageClassificationGateway.js and
 * services/imageClassificationContract.js.
 */

const fs = require('fs');
const logger = require('../utils/logger');
const { ok, fail } = require('../utils/apiResponse');
const { msg } = require('../utils/messages');
const gateway = require('../services/imageClassificationGateway');

function safeDelete(filePath) {
  if (!filePath) return;
  fs.unlink(filePath, (err) => {
    if (err && err.code !== 'ENOENT') {
      logger.error('Error deleting image file', { filePath, error: err.message });
    }
  });
}

const predictImage = async (req, res) => {
  if (!req.file || !req.file.path) {
    return fail(res, msg('image.no_file'), 400, 'IMAGE_MISSING');
  }

  const imagePath = req.file.path;

  try {
    const imageData = await fs.promises.readFile(imagePath);
    const result = await gateway.classify(imageData);

    if (!result.ok) {
      logger.warn('Image classification returned error', {
        code: result.code,
        status: result.httpStatus,
      });
      return fail(
        res,
        result.error || msg('image.classification_failed'),
        result.httpStatus,
        result.code,
        result.meta
      );
    }

    logger.info('Image classification succeeded', {
      source: result.data.classification.source,
      uncertain: result.data.classification.uncertain,
      durationMs: result.data.explainability.durationMs,
    });

    return ok(res, result.data);
  } catch (error) {
    logger.error('Unexpected error in image classification controller', {
      error: error.message,
      filePath: imagePath,
    });
    return fail(res, msg('general.internal_error'), 500, 'INTERNAL_ERROR');
  } finally {
    safeDelete(imagePath);
  }
};

module.exports = { predictImage };
