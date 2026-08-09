/**
 * TheMealDB source adapter.
 *
 * Free educational tier (test key "1"); attribution is required in the UI.
 * This module is the only place that knows TheMealDB's wire format — everything
 * downstream sees the neutral shapes documented in technical_docs/recipe-sources-design.md.
 */
const axios = require('axios');

const SOURCE_ID = 'themealdb';
const BASE_URL = 'https://www.themealdb.com/api/json/v1/1';
const REQUEST_TIMEOUT_MS = 5000;
const MAX_INGREDIENT_SLOTS = 20;

function cleanText(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function toSearchRow(meal) {
  return {
    source: SOURCE_ID,
    external_id: cleanText(meal.idMeal),
    title: cleanText(meal.strMeal),
    thumbnail: cleanText(meal.strMealThumb) || null,
    cuisine: cleanText(meal.strArea) || null,
    category: cleanText(meal.strCategory) || null,
  };
}

function collapseIngredients(meal) {
  const ingredients = [];
  for (let slot = 1; slot <= MAX_INGREDIENT_SLOTS; slot += 1) {
    const name = cleanText(meal[`strIngredient${slot}`]);
    if (!name) continue;
    ingredients.push({ name, measure: cleanText(meal[`strMeasure${slot}`]) });
  }
  return ingredients;
}

async function search(query) {
  const response = await axios.get(`${BASE_URL}/search.php`, {
    params: { s: query },
    timeout: REQUEST_TIMEOUT_MS,
  });
  const meals = response?.data?.meals;
  if (!Array.isArray(meals)) return [];
  return meals.map(toSearchRow);
}

async function lookup(externalId) {
  const response = await axios.get(`${BASE_URL}/lookup.php`, {
    params: { i: externalId },
    timeout: REQUEST_TIMEOUT_MS,
  });
  const meal = response?.data?.meals?.[0];
  if (!meal) return null;

  return {
    source: SOURCE_ID,
    external_id: cleanText(meal.idMeal),
    title: cleanText(meal.strMeal),
    category: cleanText(meal.strCategory) || null,
    area: cleanText(meal.strArea) || null,
    instructions: cleanText(meal.strInstructions),
    thumbnail: cleanText(meal.strMealThumb) || null,
    source_url: cleanText(meal.strSource) || `https://www.themealdb.com/meal/${cleanText(meal.idMeal)}`,
    ingredients: collapseIngredients(meal),
  };
}

module.exports = { SOURCE_ID, search, lookup };
