
let {add, get, deletePlan } = require('../model/mealPlan.js');


const addMealPlan = async (req, res) => {
  try {
    const { recipe_ids, meal_type, user_id } = req.body;
    if (!recipe_ids) {
      return res.status(400).send({ error: 'Recipies are required' });
    }
    if (!meal_type) {
      return res.status(400).send({ error: 'Meal Type is required' });
    }
    if (!user_id) {
      return res.status(400).send({ error: 'UserId is required' });
    }
    const parsedRecipeIds = JSON.parse(recipe_ids);
    await add(user_id, parsedRecipeIds, meal_type);

    return res.status(201).json({ message: 'success', statusCode: 201 });

  } catch (error) {
    console.error({ error: 'error' });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getMealPlan = async (req, res) => {
  try {
    const { id, user_id } = req.body;
    if (!id) {
      return res.status(400).send({ error: 'Id is required' });
    }
     if (!user_id) {
      return res.status(400).send({ error: 'UserId is required' });
    }

    let meal_plan = await get(id, user_id);

    if (meal_plan){
      return res.status(200).json({ meal_plan: meal_plan });
    }
     return res.status(403).send({ error: 'Meal Plan not found.' });
   
  } catch (error) {
    console.error({ error: 'error' });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteMealPlan = async (req, res) => {
  try {
     const { id, user_id } = req.body;
    if (!id) {
      return res.status(400).send({ error: 'Id is required' });
    }
     if (!user_id) {
      return res.status(400).send({ error: 'UserId is required' });
    }

    await deletePlan(id, user_id);

    return res.status(204).json({ message: 'success', statusCode: 204});
   
  } catch (error) {
    console.error({ error: 'error' });
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { addMealPlan, getMealPlan, deleteMealPlan };