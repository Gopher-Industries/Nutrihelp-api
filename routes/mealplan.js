const express = require("express");
const router  = express.Router();
const controller = require('../controller/mealplanController.js');
const { 
    addMealPlanValidation, 
    getMealPlanValidation, 
    deleteMealPlanValidation 
} = require('../validators/mealplanValidator.js');
const validate = require('../middleware/validateRequest.js');

// 🔑 Import authentication + RBAC
const { authenticateToken } = require('../middleware/authenticateToken.js');
const authorizeRoles = require('../middleware/authorizeRoles.js');

// Route to add a meal plan (Nutritionist + Admin)
router.route('/')
    .post(
        authenticateToken, 
        authorizeRoles("nutritionist", "admin"), 
        addMealPlanValidation, 
        validate, 
        (req, res) => controller.addMealPlan(req, res)
    )

    // Route to get a meal plan (User + Nutritionist + Admin)
    .get(
        authenticateToken, 
        authorizeRoles("user", "nutritionist", "admin"), 
        getMealPlanValidation, 
        validate, 
        (req, res) => controller.getMealPlan(req, res)
    )

    // Route to delete a meal plan (Admin only)
    .delete(
        authenticateToken, 
        authorizeRoles("admin"), 
        deleteMealPlanValidation, 
        validate, 
        (req, res) => controller.deleteMealPlan(req, res)
    );

module.exports = router;