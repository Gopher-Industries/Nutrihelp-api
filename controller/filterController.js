const supabase = require('../dbConnection');

/**
 * GET /api/filter
 *
 * Canonical server-side recipe filter endpoint. This is intentionally the
 * ONLY discovery filter endpoint on the backend — UI-only refinements
 * (sorting client-loaded results, toggling favourites, etc.) stay in the
 * frontend. See docs/RECIPES_SCOPE.md for the full scope contract.
 *
 * Supported query parameters (all optional):
 *   - allergies        comma separated list or repeated param
 *   - dietary          single dietary name (partial match)
 *   - cuisine_id       numeric cuisine id
 *   - search           partial match on recipe_name (ILIKE)
 *   - limit            page size (default 50, max 200)
 *   - offset           pagination offset (default 0)
 *
 * Response shape is preserved as a JSON array of recipes to avoid breaking
 * existing frontend consumers.
 */
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function parsePaginationParam(value, fallback, max) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 0) return fallback;
    if (max && parsed > max) return max;
    return parsed;
}

function parseAllergyList(allergies) {
    if (!allergies) return [];
    const raw = Array.isArray(allergies) ? allergies : String(allergies).split(',');
    return raw
        .map((allergy) => String(allergy || '').toLowerCase().trim())
        .filter(Boolean);
}

const filterRecipes = async (req, res) => {
    const { allergies, dietary, cuisine_id, search } = req.query;
    const limit = parsePaginationParam(req.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
    const offset = parsePaginationParam(req.query.offset, 0);

    try {
        // Resolve dietary -> id list once. We keep partial-name matching for
        // backwards compatibility with the existing frontend dropdown.
        let dietaryFilterIds = [];
        if (dietary) {
            const { data: dietaryMapping, error: dietaryError } = await supabase
                .from('dietary_requirements')
                .select('id, name');

            if (dietaryError) throw dietaryError;

            const matches = (dietaryMapping || []).filter((d) =>
                d.name.toLowerCase().includes(String(dietary).toLowerCase())
            );

            if (!matches.length) {
                return res.status(400).json({ error: 'Invalid dietary requirement provided' });
            }

            dietaryFilterIds = matches.map((d) => d.id.toString());
        }

        // Validate allergens against the canonical allergies table.
        const allergyList = parseAllergyList(allergies);
        if (allergyList.length) {
            const { data: allergensMapping, error: allergensError } = await supabase
                .from('allergies')
                .select('id, name');

            if (allergensError) throw allergensError;

            const allKnown = allergyList.every((allergy) =>
                (allergensMapping || []).some((a) => a.name.toLowerCase().includes(allergy))
            );

            if (!allKnown) {
                return res.status(400).json({ error: 'Invalid allergen provided' });
            }
        }

        // Build the base query with server-side filters where Supabase supports
        // them. Allergy filtering relies on joined ingredient data, so it still
        // runs in JS, but the result set is pre-narrowed by cuisine/search.
        let query = supabase
            .from('recipes')
            .select(`
                id,
                recipe_name,
                cuisine_id,
                dietary,
                dietary_requirements (
                    id,
                    name
                ),
                ingredients (
                    id,
                    name,
                    allergies_type (
                        id,
                        name
                    )
                )
            `);

        if (cuisine_id) {
            const cuisineIdNum = Number.parseInt(cuisine_id, 10);
            if (!Number.isFinite(cuisineIdNum)) {
                return res.status(400).json({ error: 'cuisine_id must be numeric' });
            }
            query = query.eq('cuisine_id', cuisineIdNum);
        }

        if (search) {
            // Escape % and _ to keep ILIKE safe-ish; treat the rest as literal.
            const safeSearch = String(search).replace(/[%_]/g, (c) => `\\${c}`);
            query = query.ilike('recipe_name', `%${safeSearch}%`);
        }

        // Pull a slightly larger window than `limit` because allergy filtering
        // can shrink the page; we re-slice after filtering.
        query = query.range(offset, offset + Math.max(limit * 2, limit + 25) - 1);

        const { data: recipes, error: recipeError } = await query;
        if (recipeError) throw recipeError;

        const filteredRecipes = (recipes || []).filter((recipe) => {
            const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];

            const hasAllergy = ingredients.some((ingredient) => {
                if (!ingredient?.allergies_type?.name) return false;
                const allergenName = ingredient.allergies_type.name.toLowerCase();
                return allergyList.some((allergy) => allergenName.includes(allergy));
            });

            if (hasAllergy) return false;

            const dietaryCheck =
                !dietaryFilterIds.length ||
                (recipe.dietary && dietaryFilterIds.includes(recipe.dietary.toString()));

            return dietaryCheck;
        });

        // Apply final pagination slice after allergy filtering.
        const page = filteredRecipes.slice(0, limit);

        return res.status(200).json(page);
    } catch (error) {
        console.error('Error filtering recipes:', error.message);
        return res.status(400).json({ error: error.message });
    }
};

module.exports = {
    filterRecipes,
};
