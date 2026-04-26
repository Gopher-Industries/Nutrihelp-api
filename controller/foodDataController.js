const fetchAllDietaryRequirements = require("../model/fetchAllDietaryRequirements.js");
const fetchAllCuisines = require("../model/fetchAllCuisines.js");
const fetchAllAllergies = require("../model/fetchAllAllergies.js");
const fetchAllIngredients = require("../model/fetchAllIngredients.js");
const fetchAllCookingMethods = require("../model/fetchAllCookingMethods.js");
const fetchAllSpiceLevels = require("../model/fetchAllSpiceLevels.js");
const fetchAllHealthConditions = require("../model/fetchAllHealthConditions");
const logger = require("../utils/logger");

const LOOKUP_CACHE_TTL_MS = 5 * 60 * 1000;
const LOOKUP_RETRY_ATTEMPTS = 3;
const LOOKUP_RETRY_BASE_DELAY_MS = 120;

const lookupCache = new Map();

function isRetryableLookupError(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("socket") ||
    message.includes("econn") ||
    message.includes("etimedout")
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(fetcher) {
  let lastError = null;

  for (let attempt = 1; attempt <= LOOKUP_RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await fetcher();
    } catch (error) {
      lastError = error;
      if (attempt === LOOKUP_RETRY_ATTEMPTS || !isRetryableLookupError(error)) {
        break;
      }

      await sleep(LOOKUP_RETRY_BASE_DELAY_MS * attempt);
    }
  }

  throw lastError;
}

async function getCachedLookup(cacheKey, fetcher) {
  const cached = lookupCache.get(cacheKey);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const data = await fetchWithRetry(fetcher);
  const normalized = Array.isArray(data) ? data : [];

  lookupCache.set(cacheKey, {
    data: normalized,
    expiresAt: now + LOOKUP_CACHE_TTL_MS
  });

  return normalized;
}

function createLookupHandler(cacheKey, fetcher, label) {
  return async (req, res) => {
    try {
      const rows = await getCachedLookup(cacheKey, fetcher);
      return res.status(200).json(rows);
    } catch (error) {
      logger.error(`Error loading ${label}`, {
        error: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      });

      return res.status(500).json({ error: "Internal server error" });
    }
  };
}

const getAllDietaryRequirements = createLookupHandler(
  "dietary_requirements",
  fetchAllDietaryRequirements,
  "dietary requirements"
);

const getAllCuisines = createLookupHandler(
  "cuisines",
  fetchAllCuisines,
  "cuisines"
);

const getAllAllergies = createLookupHandler(
  "allergies",
  fetchAllAllergies,
  "allergies"
);

const getAllIngredients = createLookupHandler(
  "ingredients",
  fetchAllIngredients,
  "ingredients"
);

const getAllCookingMethods = createLookupHandler(
  "cooking_methods",
  fetchAllCookingMethods,
  "cooking methods"
);

const getAllSpiceLevels = createLookupHandler(
  "spice_levels",
  fetchAllSpiceLevels,
  "spice levels"
);

const getAllHealthConditions = createLookupHandler(
  "health_conditions",
  fetchAllHealthConditions,
  "health conditions"
);

module.exports = {
  getAllDietaryRequirements,
  getAllCuisines,
  getAllAllergies,
  getAllIngredients,
  getAllCookingMethods,
  getAllSpiceLevels,
  getAllHealthConditions
};
