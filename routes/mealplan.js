const express = require("express");
const router  = express.Router();
const { coreApp } = require('../controller');
const {
    addMealPlanValidation,
    getMealPlanValidation,
    deleteMealPlanValidation
} = require('../validators/mealplanValidator.js');
const {
    addAiMealSuggestionValidation,
    deleteAiMealSuggestionValidation,
} = require('../validators/aiMealSuggestionValidator.js');
const validate = require('../middleware/validateRequest.js');

// 🔑 Import authentication + RBAC
const { authenticateToken } = require('../middleware/authenticateToken.js');
const authorizeRoles = require('../middleware/authorizeRoles.js');

const { mealplan: controller } = coreApp;

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

// AI meal suggestion routes — accessible by all authenticated users
router.route('/ai-suggestion')
    .post(
        authenticateToken,
        authorizeRoles("user", "nutritionist", "admin"),
        addAiMealSuggestionValidation,
        validate,
        (req, res) => controller.addAiMealSuggestion(req, res)
    )
    .get(
        authenticateToken,
        authorizeRoles("user", "nutritionist", "admin"),
        (req, res) => controller.getAiMealSuggestions(req, res)
    )
    .delete(
        authenticateToken,
        authorizeRoles("user", "nutritionist", "admin"),
        deleteAiMealSuggestionValidation,
        validate,
        (req, res) => controller.deleteAiMealSuggestion(req, res)
    );

module.exports = router;
