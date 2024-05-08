const supabase = require("../dbConnection.js");

async function fetchUserPreferences(userId) {
    try {
        const { data: dietaryRequirements, error: drError } = await supabase
            .from('user_dietary_requirements')
            .select('...dietary_requirement_id(id, name)')
            .eq('user_id', userId);
        if (drError) throw drError;

        const { data: allergies, error: aError } = await supabase
            .from('user_allergies')
            .select('...allergy_id(id, name)')
            .eq('user_id', userId);
        if (aError) throw aError;

        const { data: cuisines, error: cError } = await supabase
            .from('user_cuisines')
            .select('...cuisine_id(id, name)')
            .eq('user_id', userId);
        if (cError) throw cError;

        const { data: dislikes, error: dError } = await supabase
            .from('user_dislikes')
            .select('...dislike_id(id, name)')
            .eq('user_id', userId);
        if (dError) throw dError;

        const { data: healthConditions, error: hcError } = await supabase
            .from('user_health_conditions')
            .select('...health_condition_id(id, name)')
            .eq('user_id', userId);
        if (hcError) throw hcError;

        const { data: spiceLevels, error: slError } = await supabase
            .from('user_spice_levels')
            .select('...spice_level_id(id, name)')
            .eq('user_id', userId);
        if (slError) throw slError;

        const { data: cookingMethods, error: cmError } = await supabase
            .from('user_cooking_methods')
            .select('...cooking_method_id(id, name)')
            .eq('user_id', userId);
        if (cmError) throw cmError;

        return {
            dietary_requirements: dietaryRequirements,
            allergies: allergies,
            cuisines: cuisines,
            dislikes: dislikes,
            health_conditions: healthConditions,
            spice_levels: spiceLevels,
            cooking_methods: cookingMethods
        };
    } catch (error) {
        throw error;
    }
}

module.exports = fetchUserPreferences;
