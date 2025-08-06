const express = require('express');
const router = express.Router();
const estimatedCostController = require('../controller/estimatedCostController');

router.route('/:recipe_id').get(estimatedCostController.getCost);

module.exports = router;
