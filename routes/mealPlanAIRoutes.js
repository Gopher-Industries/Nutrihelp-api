const express = require('express');
const router = express.Router();
const { generateAIMealPlan } = require('../controller/mealPlanAIController');
const { submitFeedback } = require('../controller/mealPlanAIFeedbackController');

/**
 * @swagger
 * /api/meal-plan/ai-generate:
 *   post:
 *     tags:
 *       - MealPlanAI
 *     summary: Generate a personalised 7-day elderly-focused AI meal plan
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dietType:
 *                 type: string
 *                 example: balanced
 *                 description: "Dietary pattern (e.g. balanced, vegetarian, vegan, Mediterranean, diabetic-friendly)"
 *               goal:
 *                 type: string
 *                 example: maintain weight
 *                 description: "Health goal (e.g. maintain weight, lose weight, build muscle, manage blood sugar)"
 *               allergies:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["nuts", "shellfish"]
 *                 description: Allergens to strictly exclude from all meals
 *               calorieTarget:
 *                 type: number
 *                 example: 1800
 *                 description: Target daily calories (500–5000). Default 1800 for elderly.
 *               cuisine:
 *                 type: string
 *                 example: Mediterranean
 *                 description: Preferred cuisine style
 *               healthConditions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["diabetes", "hypertension"]
 *                 description: "Active health conditions that affect meal planning (e.g. diabetes, hypertension, osteoporosis, kidney_disease, heart_disease, constipation, dysphagia)"
 *               mealTexture:
 *                 type: string
 *                 enum: [regular, soft, pureed]
 *                 example: soft
 *                 description: "Texture requirement — soft/pureed for chewing or swallowing difficulties"
 *               mobilityLevel:
 *                 type: string
 *                 enum: [sedentary, lightly_active, moderately_active]
 *                 example: sedentary
 *                 description: Physical activity level, influences calorie and portion recommendations
 *               cookingComplexity:
 *                 type: string
 *                 enum: [simple, moderate, complex]
 *                 example: simple
 *                 description: "Preferred recipe complexity — simple = under 30 min, few steps"
 *               portionSize:
 *                 type: string
 *                 enum: [small, medium, large]
 *                 example: medium
 *                 description: Preferred portion size per meal
 *               additionalNotes:
 *                 type: string
 *                 example: Patient is on warfarin, limit high Vitamin K foods
 *                 description: Free-text notes for the dietitian context (max 300 characters)
 *     responses:
 *       200:
 *         description: Successfully generated 7-day meal plan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     plan:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           day:
 *                             type: string
 *                             example: Monday
 *                           breakfast:
 *                             type: object
 *                           lunch:
 *                             type: object
 *                           dinner:
 *                             type: object
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: calorieTarget must be between 500 and 5000
 *       500:
 *         description: AI service error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: AI generation failed, please try again
 */
router.post('/ai-generate', generateAIMealPlan);

/**
 * @swagger
 * /api/meal-plan/feedback/{planId}:
 *   post:
 *     tags:
 *       - MealPlanAI
 *     summary: Submit rating and feedback for a generated meal plan
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The plan ID returned from ai-generate
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 4
 *                 description: Overall plan rating from 1 (poor) to 5 (excellent)
 *               likedMeals:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Monday Breakfast", "Wednesday Dinner"]
 *                 description: Names or labels of meals the user liked
 *               dislikedMeals:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Friday Lunch"]
 *                 description: Names or labels of meals the user disliked
 *               followedPlan:
 *                 type: boolean
 *                 example: true
 *                 description: Whether the user actually followed this meal plan
 *               notes:
 *                 type: string
 *                 example: Portions were a bit large for me
 *                 description: Optional free-text feedback (max 500 characters)
 *     responses:
 *       201:
 *         description: Feedback saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 feedbackId:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Validation error
 *       404:
 *         description: Meal plan not found
 *       500:
 *         description: Internal server error
 */
router.post('/feedback/:planId', submitFeedback);

module.exports = router;
