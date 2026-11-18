'use strict';

/**
 * AI Assessment Prediction Contract routes (FE-06). Mounted at /api/ai-assessment.
 *
 * GET  /contract   public   contract version, input fields, enums, error codes
 * POST /predict    user     AI model prediction for the assessment screen
 *
 * Contract: technical_docs/AI Assessment Prediction Contract.md
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticateToken } = require('../middleware/authenticateToken');
const { createAiAssessmentController } = require('../controller/aiAssessmentController');
const { ERROR_CODES } = require('../contracts/ai-assessment/v1');

const router = express.Router();
const controller = createAiAssessmentController();

// Each call reaches the AI model, so cap it per signed-in user.
const predictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AI_ASSESSMENT_RATE_LIMIT) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `ai-assessment:${req.user?.userId}`,
  message: {
    success: false,
    error: 'You have run several AI checks recently. Please try again in 15 minutes.',
    code: ERROR_CODES.RATE_LIMITED,
  },
});

/**
 * @swagger
 * /api/ai-assessment/contract:
 *   get:
 *     tags: [AIAssessment]
 *     summary: AI assessment contract (version, input fields, enums, error codes)
 */
router.get('/contract', controller.getContract);

router.use(authenticateToken);

/**
 * @swagger
 * /api/ai-assessment/predict:
 *   post:
 *     tags: [AIAssessment]
 *     summary: AI model prediction for the assessment screen
 *     security: [{ BearerAuth: [] }]
 */
router.post('/predict', predictLimiter, controller.predict);

module.exports = router;
