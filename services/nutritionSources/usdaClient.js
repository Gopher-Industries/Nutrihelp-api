/**
 * USDA FoodData Central HTTP client.
 *
 * The only module that knows USDA's wire format and endpoints. Public domain
 * data (CC0). Docs: https://fdc.nal.usda.gov/api-guide
 *
 * Set USDA_API_KEY (free from https://api.data.gov/signup). Without it the
 * public DEMO_KEY is used, which allows about 10 requests an hour: enough to
 * try the feature, not enough to run it.
 */
const axios = require('axios');
const logger = require('../../utils/logger');

const BASE_URL = 'https://api.nal.usda.gov/fdc/v1';
const REQUEST_TIMEOUT_MS = 5000;
// Generic foods only. Branded and survey records describe products and
// composite dishes, which are poor stand-ins for a recipe ingredient.
const DATA_TYPES = 'SR Legacy,Foundation';
const DEFAULT_PAGE_SIZE = 8;

let warnedAboutDemoKey = false;

class UsdaError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'UsdaError';
    this.code = code;
  }
}

function apiKey() {
  const configured = String(process.env.USDA_API_KEY || '').trim();
  if (configured) return configured;
  if (!warnedAboutDemoKey) {
    warnedAboutDemoKey = true;
    logger.warn(
      '[nutritionSources][usda] USDA_API_KEY is not set, using the rate-limited DEMO_KEY'
    );
  }
  return 'DEMO_KEY';
}

// The key goes in a header so it never lands in a URL, a proxy log or an error message.
function requestConfig(params) {
  return { params, headers: { 'X-Api-Key': apiKey() }, timeout: REQUEST_TIMEOUT_MS };
}

function toUsdaError(error, action) {
  const status = error?.response?.status;
  if (status === 429)
    return new UsdaError('rate_limited', `USDA rate limit reached while ${action}`);
  return new UsdaError(
    'unavailable',
    `USDA request failed while ${action}: ${error?.message || 'unknown error'}`
  );
}

/**
 * @param {string} query ingredient name
 * @returns {Promise<Array<{fdcId, description, dataType, foodNutrients}>>}
 */
async function searchFoods(query, { pageSize = DEFAULT_PAGE_SIZE } = {}) {
  const text = String(query || '').trim();
  if (!text) return [];

  try {
    const response = await axios.get(
      `${BASE_URL}/foods/search`,
      requestConfig({ query: text, dataType: DATA_TYPES, pageSize })
    );
    const foods = Array.isArray(response?.data?.foods) ? response.data.foods : [];
    return foods.map((food) => ({
      fdcId: food.fdcId,
      description: food.description,
      dataType: food.dataType,
      foodNutrients: food.foodNutrients || [],
    }));
  } catch (error) {
    throw toUsdaError(error, `searching "${text}"`);
  }
}

/**
 * Full record for one food. Needed for `foodPortions`, which search omits.
 * @returns {Promise<{fdcId, description, dataType, foodNutrients, foodPortions}|null>}
 */
async function getFood(fdcId) {
  if (!/^[1-9]\d*$/.test(String(fdcId))) return null;

  try {
    const response = await axios.get(`${BASE_URL}/food/${fdcId}`, requestConfig({}));
    const food = response?.data;
    if (!food) return null;
    return {
      fdcId: food.fdcId,
      description: food.description,
      dataType: food.dataType,
      foodNutrients: food.foodNutrients || [],
      foodPortions: food.foodPortions || [],
    };
  } catch (error) {
    if (error?.response?.status === 404) return null;
    throw toUsdaError(error, `loading food ${fdcId}`);
  }
}

module.exports = { searchFoods, getFood, UsdaError };
