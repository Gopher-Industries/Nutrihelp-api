const express = require('express');
const { filterRecipes } = require('../controller/filterController');

const router = express.Router();

// Define the route for /api/filter
router.get('/', filterRecipes);

module.exports = router;