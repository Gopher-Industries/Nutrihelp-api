const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { executePythonScript } = require('../services/aiExecutionService');
const { ok, fail } = require('../utils/apiResponse');
const { msg } = require('../utils/messages');
const monitor = require('../services/aiServiceMonitor');

const SERVICE_NAME = 'image_classification';

const deleteFile = (filePath) => {
  fs.unlink(filePath, (err) => {
    if (err) logger.error('Error deleting image file', { filePath, error: err.message });
  });
};

const predictImage = async (req, res) => {
  if (!req.file || !req.file.path) {
    return fail(res, msg('image.no_file'), 400, 'IMAGE_MISSING');
  }

  const imagePath = req.file.path;

  // Circuit-breaker check — refuse early if service is known-down
  if (monitor.isCircuitOpen(SERVICE_NAME)) {
    logger.warn('Image classification circuit is open — returning 503');
    deleteFile(imagePath);
    return fail(res, msg('image.classification_unavailable'), 503, 'AI_SERVICE_UNAVAILABLE');
  }

  try {
    const imageData = await fs.promises.readFile(imagePath);
    const start = Date.now();

    const result = await executePythonScript({
      scriptPath: path.join(__dirname, '..', 'model', 'imageClassification.py'),
      stdin: imageData,
      serviceName: SERVICE_NAME,
    });

    const durationMs = Date.now() - start;
    const explainability = monitor.buildExplainability(SERVICE_NAME, result, durationMs);

    if (!result.success) {
      const isTimeout = result.timedOut;
      const status = isTimeout ? 504 : 500;
      const errorMsg = isTimeout
        ? msg('image.classification_timeout')
        : msg('image.classification_failed');
      const code = isTimeout ? 'AI_TIMEOUT' : 'AI_FAILED';

      logger.error('Image classification failed', {
        error: result.error,
        timedOut: isTimeout,
        durationMs,
      });

      return fail(res, errorMsg, status, code);
    }

    return ok(res, {
      prediction: result.prediction,
      confidence: result.confidence,
      explainability,
    });
  } catch (error) {
    logger.error('Error in image classification controller', {
      error: error.message,
      filePath: imagePath,
    });
    return fail(res, msg('general.internal_error'), 500, 'INTERNAL_ERROR');
  } finally {
    deleteFile(imagePath);
  }
};

module.exports = { predictImage };
