const express = require('express');
const router = express.Router();
const estimatedCostController = require('../controller/estimatedCostController');

router.route('/:recipe_id').get(estimatedCostController.getFullCost);
router.route('/:recipe_id/:exclude_ids').get(estimatedCostController.getPartialCost);

module.exports = router;
