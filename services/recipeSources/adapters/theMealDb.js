/**
 * TheMealDB source adapter.
 *
 * Free educational tier (test key "1"); attribution is required in the UI.
 * This module is the only place that knows TheMealDB's wire format — everything
 * downstream sees the neutral shapes documented in technical_docs/recipe-sources-design.md.
 */
const axios = require('axios');
const logger = require('../../../utils/logger');

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
  const startedAt = Date.now();
  logger.debug(`[recipeSources][${SOURCE_ID}] search.php request`, { query });

  const response = await axios.get(`${BASE_URL}/search.php`, {
    params: { s: query },
    timeout: REQUEST_TIMEOUT_MS,
  });
  const meals = response?.data?.meals;
  const rows = Array.isArray(meals) ? meals.map(toSearchRow) : [];

  logger.info(`[recipeSources][${SOURCE_ID}] search.php response`, {
    query,
    results: rows.length,
    ms: Date.now() - startedAt,
  });

  return rows;
}

async function lookup(externalId) {
  const startedAt = Date.now();
  logger.debug(`[recipeSources][${SOURCE_ID}] lookup.php request`, { externalId });

  const response = await axios.get(`${BASE_URL}/lookup.php`, {
    params: { i: externalId },
    timeout: REQUEST_TIMEOUT_MS,
  });
  const meal = response?.data?.meals?.[0];

  if (!meal) {
    logger.warn(`[recipeSources][${SOURCE_ID}] lookup.php miss`, {
      externalId,
      ms: Date.now() - startedAt,
    });
    return null;
  }

  const ingredients = collapseIngredients(meal);
  logger.info(`[recipeSources][${SOURCE_ID}] lookup.php response`, {
    externalId,
    title: cleanText(meal.strMeal),
    ingredients: ingredients.length,
    instructionChars: cleanText(meal.strInstructions).length,
    ms: Date.now() - startedAt,
  });

  return {
    source: SOURCE_ID,
    external_id: cleanText(meal.idMeal),
    title: cleanText(meal.strMeal),
    category: cleanText(meal.strCategory) || null,
    area: cleanText(meal.strArea) || null,
    instructions: cleanText(meal.strInstructions),
    thumbnail: cleanText(meal.strMealThumb) || null,
    source_url: cleanText(meal.strSource) || `https://www.themealdb.com/meal/${cleanText(meal.idMeal)}`,
    ingredients,
  };
}

module.exports = { SOURCE_ID, search, lookup };
