const { validationResult } = require('express-validator');
let { add, get, deletePlan, saveMealRelation } = require('../model/mealPlan.js');


const addMealPlan = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { recipe_ids, meal_type, user_id } = req.body;

    let meal_plan = await add(user_id, { recipe_ids: recipe_ids }, meal_type);

    await saveMealRelation(user_id, recipe_ids, meal_plan[0].id);

    return res.status(201).json({ message: 'success', statusCode: 201, meal_plan: meal_plan });

  } catch (error) {
    console.error({ error: 'error' });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getMealPlan = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { user_id } = req.body;

    let meal_plans = await get(user_id);

    if (meal_plans) {
      return res.status(200).json({ message: 'success', statusCode: 200, meal_plans: meal_plans });
    }
    return res.status(404).send({ error: 'Meal Plans not found for user.' });

  } catch (error) {
    console.error({ error: 'error' });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteMealPlan = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id, user_id } = req.body;

    await deletePlan(id, user_id);

    return res.status(204).json({ message: 'success', statusCode: 204 });

  } catch (error) {
    console.error({ error: 'error' });
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { addMealPlan, getMealPlan, deleteMealPlan };