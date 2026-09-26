const express = require('express');
const { filterRecipes } = require('../controller/filterController');

const router = express.Router();

// Define the /filter route
router.get('/', filterRecipes);

module.exports = router;