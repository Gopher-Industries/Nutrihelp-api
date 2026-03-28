const supabase = require("../dbConnection.js");

async function updateUserPreferences(userId, body) {
    try {
        if (!body.dietary_requirements || !body.allergies || !body.cuisines || !body.dislikes || !body.health_conditions || !body.spice_levels || !body.cooking_methods) {
            throw "Missing required fields";
        }

        const {error: drError} = await supabase
            .from("user_dietary_requirements")
            .delete()
            .eq("user_id", userId);
        if (drError) throw drError;

        const {error: aError} = await supabase
            .from("user_allergies")
            .delete()
            .eq("user_id", userId);
        if (aError) throw aError;

        const {error: cError} = await supabase
            .from("user_cuisines")
            .delete()
            .eq("user_id", userId);
        if (cError) throw cError;

        const {error: dError} = await supabase
            .from("user_dislikes")
            .delete()
            .eq("user_id", userId);
        if (dError) throw dError;

        const {error: hError} = await supabase
            .from("user_health_conditions")
            .delete()
            .eq("user_id", userId);
        if (hError) throw hError;

        const {error: sError} = await supabase
            .from("user_spice_levels")
            .delete()
            .eq("user_id", userId);
        if (sError) throw sError;

        const {error: cmError} = await supabase
            .from("user_cooking_methods")
            .delete()
            .eq("user_id", userId);
        if (cmError) throw cmError;

        const {error: driError} = await supabase
            .from("user_dietary_requirements")
            .insert(body.dietary_requirements.map((id) => ({user_id: userId, dietary_requirement_id: id})));
        if (driError) throw driError;

        const {error: aiError} = await supabase
            .from("user_allergies")
            .insert(body.allergies.map((id) => ({user_id: userId, allergy_id: id})));
        if (aiError) throw aiError;

        const {error: ciError} = await supabase
            .from("user_cuisines")
            .insert(body.cuisines.map((id) => ({user_id: userId, cuisine_id: id})));
        if (ciError) throw ciError;

        const {error: diError} = await supabase
            .from("user_dislikes")
            .insert(body.dislikes.map((id) => ({user_id: userId, dislike_id: id})));
        if (diError) throw diError;

        const {error: hiError} = await supabase
            .from("user_health_conditions")
            .insert(body.health_conditions.map((id) => ({user_id: userId, health_condition_id: id})));
        if (hiError) throw hiError;

        const {error: siError} = await supabase
            .from("user_spice_levels")
            .insert(body.spice_levels.map((id) => ({user_id: userId, spice_level_id: id})));
        if (siError) throw siError;

        const {error: cmiError} = await supabase
            .from("user_cooking_methods")
            .insert(body.cooking_methods.map((id) => ({user_id: userId, cooking_method_id: id})));
        if (cmiError) throw cmiError;
    } catch (error) {
        throw error;
    }
}

module.exports = updateUserPreferences;