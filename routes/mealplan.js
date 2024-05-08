const express = require("express");
const router  = express.Router();
const controller = require('../controller/mealplanController.js');

router.route('/').post(function(req,res) {
    controller.addMealPlan(req, res);
});

router.route('/').get(function(req,res) {
    controller.getMealPlan(req, res);
});

router.route('/').delete(function(req,res) {
    controller.delete(req, res);
});

module.exports = router;