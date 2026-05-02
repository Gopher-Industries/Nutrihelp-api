// model/getRecipeIngredients.js (robust id handling)
const supabase = require("../dbConnection.js");

// Helper: safe detection for numeric ids
const isIntegerString = (v) => {
  if (v === null || v === undefined) return false;
  return String(v).match(/^[0-9]+$/) !== null;
};

// Get data from Supabase: id only (safe)
async function getIngredients(recipe_id) {
  try {
    // Support array or single id
    const ids = Array.isArray(recipe_id) ? recipe_id : [recipe_id];

    // Prefer numeric id lookup first
    const numericIds = ids.filter(isIntegerString).map(Number);
    if (numericIds.length) {
      const { data, error } = await supabase
        .from("recipes")
        .select("ingredients")
        .in("id", numericIds);

      if (!error && Array.isArray(data)) return data;
      if (error) console.warn("Supabase getIngredients numeric lookup error:", error);
    }

    // Try exact match on id as string (covers uuid stored in id column)
    for (const id of ids) {
      try {
        const { data, error } = await supabase
          .from("recipes")
          .select("ingredients")
          .eq("id", id)
          .limit(1)
          .maybeSingle();

        if (!error && data) return [data];
        if (error) console.warn("Supabase getIngredients eq(id) error for id=", id, error);
      } catch (e) {
        // continue
      }
    }

    // Try common uuid-like columns
    const uuidCols = ["uuid", "recipe_uuid", "external_id"];
    for (const col of uuidCols) {
      for (const id of ids) {
        try {
          const { data, error } = await supabase
            .from("recipes")
            .select("ingredients")
            .eq(col, id)
            .limit(1)
            .maybeSingle();

          if (!error && data) return [data];
          if (error) console.warn(`Supabase getIngredients ${col} lookup error for ${id}:`, error);
        } catch (e) {
          // ignore
        }
      }
    }

    // Finally try recipe_name substring match (useful if a name was passed)
    for (const id of ids) {
      try {
        const pattern = `%${id}%`;
        const { data, error } = await supabase
          .from("recipes")
          .select("ingredients")
          .ilike("recipe_name", pattern)
          .limit(1);

        if (!error && Array.isArray(data) && data.length) return data;
        if (error) console.warn("Supabase getIngredients recipe_name lookup error for:", id, error);
      } catch (e) {
        // ignore
      }
    }

    // nothing found
    return [];
  } catch (error) {
    console.error("getIngredients exception:", error);
    return [];
  }
}

// Get data from Supabase, id and total servings - robust version
async function getIngredientsWithTotalServing(recipe_id) {
  try {
    const ids = Array.isArray(recipe_id) ? recipe_id : [recipe_id];

    // 1) Numeric id lookup first (safe)
    const numericIds = ids.filter(isIntegerString).map(Number);
    if (numericIds.length) {
      try {
        const { data, error } = await supabase
          .from("recipes")
          .select("total_servings, ingredients")
          .in("id", numericIds);

        if (!error && Array.isArray(data) && data.length) return data;
        if (error) console.warn("Supabase getIngredientsWithTotalServing numeric lookup error:", error);
      } catch (e) {
        // log and continue
        console.warn("Supabase numeric lookup threw:", e && e.message);
      }
    }

    // 2) Exact match on id as string (covers uuid stored in id)
    for (const id of ids) {
      try {
        const { data, error } = await supabase
          .from("recipes")
          .select("total_servings, ingredients")
          .eq("id", id)
          .limit(1)
          .maybeSingle();

        if (!error && data) return [data];
        if (error) console.warn("Supabase eq(id) lookup error for id=", id, error);
      } catch (e) {
        // ignore
      }
    }

    // 3) Try common uuid columns
    const uuidCols = ["uuid", "recipe_uuid", "external_id"];
    for (const col of uuidCols) {
      for (const id of ids) {
        try {
          const { data, error } = await supabase
            .from("recipes")
            .select("total_servings, ingredients")
            .eq(col, id)
            .limit(1)
            .maybeSingle();

          if (!error && data) return [data];
          if (error) console.warn(`Supabase ${col} lookup error for ${id}:`, error);
        } catch (e) {
          // ignore
        }
      }
    }

    // 4) recipe_name substring match as last resort
    for (const id of ids) {
      try {
        const pattern = `%${id}%`;
        const { data, error } = await supabase
          .from("recipes")
          .select("total_servings, ingredients")
          .ilike("recipe_name", pattern)
          .limit(1);

        if (!error && Array.isArray(data) && data.length) return data;
        if (error) console.warn("Supabase recipe_name lookup error for:", id, error);
      } catch (e) {
        // ignore
      }
    }

    // nothing found
    return [];
  } catch (error) {
    console.error("getIngredientsWithTotalServing exception:", error);
    return [];
  }
}

// Get and return result to user
async function getOriginalIngredients(recipe_id) {
  const result = {
    status: 404,
    error: "",
    ingredients: {}
  };

  const data = await getIngredients(recipe_id);
  if (!Array.isArray(data) || data.length === 0) {
    result.error = "Invalid recipe id, ingredients not found";
    return result;
  }

  result.status = 200;
  result.ingredients = data[0].ingredients || {};
  return result;
}

// Get and return result to user
async function getScaledIngredientsByServing(recipe_id, desired_servings) {
  const result = {
    status: 404,
    error: "",
    ingredients: {},
    scaling_detail: {}
  };

  // Normalize desired_servings
  const desired = Number(desired_servings);
  if (!Number.isFinite(desired) || desired <= 0) {
    result.error = "Invalid desired_servings";
    return result;
  }

  // Get recipe data
  const data = await getIngredientsWithTotalServing([recipe_id]);
  if (!Array.isArray(data) || data.length === 0) {
    result.error = "Invalid recipe id, can not scale";
    return result;
  }

  // Get recipe's ingredients and serving
  const recipe_serving = Number(data[0].total_servings) || 0;
  if (!recipe_serving || recipe_serving === 0) {
    result.error = "Recipe contains invalid total serving, can not scale";
    return result;
  }

  const recipe_ingredients = data[0].ingredients || {};
  // Ensure the shape is what we expect (id array, quantity array)
  const ids = Array.isArray(recipe_ingredients.id) ? recipe_ingredients.id : null;
  const quantities = Array.isArray(recipe_ingredients.quantity) ? recipe_ingredients.quantity : null;

  if (!ids || !quantities) {
    result.error = "Recipe contains invalid ingredients data, can not scale";
    return result;
  }

  // Scale
  const ratio = desired / recipe_serving;

  // Safely map quantities (coerce to numbers, preserve length)
  const scaledQuantities = quantities.map(qty => {
    const n = Number(qty);
    return Number.isFinite(n) ? n * ratio : null;
  });

  result.status = 200;
  result.ingredients = {
    id: ids,
    quantity: scaledQuantities,
    measurement: recipe_ingredients.measurement || []
  };
  result.scaling_detail = {
    id: recipe_id,
    scale_ratio: ratio,
    desired_servings: desired,
    original_serving: recipe_serving,
    original_ingredients: recipe_ingredients
  };
  return result;
}

module.exports = {
  getOriginalIngredients,
  getScaledIngredientsByServing
};
