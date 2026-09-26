const normalizeId = require('../utils/normalizeId');
const supabase = require('../dbConnection');
let getScaledRecipe = require('../model/getRecipeIngredients');

/**
 * Helper: attempt to find a numeric recipe id from a candidate.
 * Tries several fallbacks:
 *  - direct equality on id (if candidate numeric)
 *  - equality on id (string) — in case id is stored as text/uuid
 *  - equality on uuid column (if present)
 *  - substring match on recipe_name
 */
async function findCanonicalRecipeId(candidate) {
  if (!candidate) return null;

  // 1) If candidate looks numeric, test it
  const asNum = Number(candidate);
  if (Number.isFinite(asNum) && Number.isInteger(asNum)) {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('id')
        .eq('id', asNum)
        .limit(1)
        .maybeSingle();

      if (!error && data && data.id != null) return data.id;
    } catch (e) {
      // ignore and continue
    }
  }

  // 2) Try exact match on id as string (covers uuid-in-id or string ids)
  try {
    const { data: idStringData, error: e2 } = await supabase
      .from('recipes')
      .select('id')
      .eq('id', candidate)
      .limit(1)
      .maybeSingle();

    if (!e2 && idStringData && idStringData.id != null) return idStringData.id;
  } catch (e) {
    // ignore
  }

  // 3) Try a uuid column if it exists (common naming: uuid, recipe_uuid)
  const uuidCandidates = ['uuid', 'recipe_uuid', 'external_id'];
  for (const col of uuidCandidates) {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('id')
        .eq(col, candidate)
        .limit(1)
        .maybeSingle();

      if (!error && data && data.id != null) return data.id;
    } catch (e) {
      // ignore
    }
  }

  // 4) Try substring match on recipe_name (useful if frontend passed a name)
  try {
    const pattern = `%${candidate}%`;
    const { data, error } = await supabase
      .from('recipes')
      .select('id')
      .ilike('recipe_name', pattern)
      .limit(1);

    if (!error && Array.isArray(data) && data.length) return data[0].id;
  } catch (e) {
    // ignore
  }

  return null;
}

/**
 * GET /api/recipe/scale/:recipe_id/:desired_servings
 * - Normalizes recipe_id (numeric or UUID)
 * - Validates desired_servings (integer >=1)
 * - Attempts to map non-canonical ids by looking up recipes
 * - Returns standardized envelope
 */
const scaleRecipe = async (req, res) => {
  let { recipe_id, desired_servings } = req.params;

  try {
    // Defensive parse of desired_servings
    const servings = parseInt(desired_servings, 10);
    if (isNaN(servings) || servings < 1) {
      return res.status(400).json({ success: false, error: 'desired_servings must be an integer >= 1' });
    }

    // Try to normalize the incoming id where possible.
    // If normalizeId returns a number, use it; otherwise keep original as candidate.
    let normalizedCandidate;
    try {
      normalizedCandidate = normalizeId(recipe_id);
    } catch (e) {
      // If normalizeId throws, fall back to raw candidate string
      normalizedCandidate = recipe_id;
    }

    // First attempt: ask the model directly (handles common cases)
    try {
      const firstAttempt = await getScaledRecipe.getScaledIngredientsByServing(normalizedCandidate, servings);
      if (firstAttempt && firstAttempt.status === 200) {
        const ingredients = (firstAttempt && firstAttempt.ingredients) ? firstAttempt.ingredients : firstAttempt;
        const scaling_detail = (firstAttempt && firstAttempt.scaling_detail) ? firstAttempt.scaling_detail : null;
        return res.status(200).json({ success: true, data: { scaled_ingredients: ingredients, scaling_detail } });
      }
      // If not found, continue to lookup fallbacks
    } catch (e) {
      // model may throw — ignore here and try resolution fallbacks
      console.error('[scaleRecipe] model threw on first attempt:', e);
    }

    // Lookup canonical numeric id using helper strategies
    const canonicalId = await findCanonicalRecipeId(recipe_id) || await findCanonicalRecipeId(String(normalizedCandidate));
    if (!canonicalId) {
      return res.status(404).json({ success: false, error: 'Recipe not found / invalid recipe id' });
    }

    // Retry scaling with canonical id
    try {
      const secondAttempt = await getScaledRecipe.getScaledIngredientsByServing(canonicalId, servings);
      if (secondAttempt && secondAttempt.status === 200) {
        const ingredients = (secondAttempt && secondAttempt.ingredients) ? secondAttempt.ingredients : secondAttempt;
        const scaling_detail = (secondAttempt && secondAttempt.scaling_detail) ? secondAttempt.scaling_detail : null;
        return res.status(200).json({ success: true, data: { scaled_ingredients: ingredients, scaling_detail } });
      }

      // If still not successful, return the model's error if present
      if (secondAttempt && secondAttempt.error) {
        return res.status(secondAttempt.status || 400).json({ success: false, error: secondAttempt.error });
      }

      return res.status(400).json({ success: false, error: 'Could not scale recipe' });
    } catch (e) {
      console.error('[scaleRecipe] error on second attempt:', e);
      return res.status(500).json({ success: false, error: 'Internal server error', details: String(e.message || e) });
    }
  } catch (error) {
    console.error('[scaleRecipe] Unexpected error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error', details: String(error.message || error) });
  }
};

module.exports = { scaleRecipe };
