const express = require('express');
const router = express.Router();
const controller = require('../controller/recipeController');
const validate = require('../middleware/validate');
const { recipeQuery } = require('../validators/schemas');

router.get('/user/:user_id', (req, res, next) => {
    // Move params to query temporarily for validation convenience or validate params
    req.query.user_id = req.params.user_id;
    next();
}, validate(recipeQuery, 'query'), controller.getUserRecipes);

module.exports = router;
