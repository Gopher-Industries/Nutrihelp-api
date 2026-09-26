const express = require('express');
const router = express.Router();
const faqController = require('../controller/faqController');

// GET /api/faq            -> all published FAQs (with seed fallback)
// GET /api/faq?category=  -> filter by category (case-insensitive)
router.get('/', faqController.getFaqs);

module.exports = router;
