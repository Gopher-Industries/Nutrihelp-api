const express = require('express');
const router = express.Router();
const controller = require('../controller/foodDatabaseController');
const validate = require('../middleware/validate');
const { foodSearchQuery } = require('../validators/schemas');

router.get('/search', validate(foodSearchQuery, 'query'), controller.searchFood);

module.exports = router;
