const express = require('express');
const router = express.Router();
const { checkFileIntegrity, generateBaseline } = require('../tools/integrity/integrityService');

/**
 * @swagger
 * /api/system/generate-baseline:
 *   post:
 *     summary: Regenerate baseline hash data for file integrity checks
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Baseline regenerated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 fileCount:
 *                   type: integer
 */

/**
 * @swagger
 * /api/system/integrity-check:
 *   get:
 *     summary: Run file integrity and anomaly check
 *     tags: [System]
 *     responses:
 *       200:
 *         description: List of file anomalies
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 anomalies:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       file:
 *                         type: string
 *                       issue:
 *                         type: string
 */

router.post('/generate-baseline', (req, res) => {
  try {
    const result = generateBaseline();
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to generate baseline", details: err.message });
  }
});

router.get('/integrity-check', (req, res) => {
  try {
    const anomalies = checkFileIntegrity();
    res.json({ anomalies });
  } catch (err) {
    res.status(500).json({ error: "Failed to check integrity", details: err.message });
  }
});


module.exports = router;