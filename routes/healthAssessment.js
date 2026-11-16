'use strict';

/**
 * AI Health Assessment routes (FE-04). Mounted at /api/health-assessment.
 *
 * GET    /questions        public   questionnaire definition that drives the UI
 * POST   /                 auth     submit answers, returns the full assessment
 * GET    /history          auth     the user's past assessments and score trend
 * GET    /latest           auth     the user's most recent full assessment
 * GET    /:id              auth     one full assessment (owner only)
 * POST   /:id/plan         auth     4-week health plan built from an assessment
 * DELETE /:id              auth     delete one assessment (owner only)
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticateToken } = require('../middleware/authenticateToken');
const { createHealthAssessmentController } = require('../controller/healthAssessmentController');

const router = express.Router();
const controller = createHealthAssessmentController();

// Each submission can call the AI model and an LLM, so cap it per user.
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.HEALTH_ASSESSMENT_SUBMIT_LIMIT) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `health-assessment:${req.user?.userId}`,
  message: {
    success: false,
    error: 'You have submitted several assessments recently. Please try again in 15 minutes.',
    code: 'HEALTH_ASSESSMENT_RATE_LIMITED',
  },
});

/**
 * @swagger
 * /api/health-assessment/questions:
 *   get:
 *     tags: [HealthAssessment]
 *     summary: Questionnaire definition for the AI Health Assessment screen
 *     responses:
 *       200:
 *         description: Sections and questions, with types, units, ranges and options
 */
router.get('/questions', controller.getQuestions);

// Everything below requires a signed-in user.
router.use(authenticateToken);

/**
 * @swagger
 * /api/health-assessment:
 *   post:
 *     tags: [HealthAssessment]
 *     summary: Submit a health assessment and receive scores, AI insights and recommendations
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HealthAssessmentSubmission'
 *     responses:
 *       201: { description: Assessment computed and saved }
 *       200: { description: Assessment computed but not saved (save=false or storage unavailable) }
 *       400: { description: Validation error; details lists each field }
 *       401: { description: Not signed in }
 *       429: { description: Too many submissions }
 */
router.post('/', submitLimiter, controller.submit);

/**
 * @swagger
 * /api/health-assessment/history:
 *   get:
 *     tags: [HealthAssessment]
 *     summary: The signed-in user's assessment history and score trend
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 12 }
 */
router.get('/history', controller.history);

/**
 * @swagger
 * /api/health-assessment/latest:
 *   get:
 *     tags: [HealthAssessment]
 *     summary: The signed-in user's most recent assessment (data is null if none)
 *     security: [{ BearerAuth: [] }]
 */
router.get('/latest', controller.latest);

/**
 * @swagger
 * /api/health-assessment/{id}:
 *   get:
 *     tags: [HealthAssessment]
 *     summary: One assessment belonging to the signed-in user
 *     security: [{ BearerAuth: [] }]
 *   delete:
 *     tags: [HealthAssessment]
 *     summary: Delete one assessment belonging to the signed-in user
 *     security: [{ BearerAuth: [] }]
 */
router.get('/:id', controller.getById);
router.delete('/:id', controller.remove);

/**
 * @swagger
 * /api/health-assessment/{id}/plan:
 *   post:
 *     tags: [HealthAssessment]
 *     summary: Generate a 4-week health plan from a saved assessment
 *     security: [{ BearerAuth: [] }]
 */
router.post('/:id/plan', submitLimiter, controller.generatePlan);

module.exports = router;
