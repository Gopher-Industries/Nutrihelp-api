const supabase = require("../dbConnection.js");

async function fetchAllIngredients() {
    try {
        let { data, error } = await supabase
            .from('ingredients')
            .select('id, name, category');

        if (error) {
            throw error;
        }

        return data;
    } catch (error) {
        throw error;
    }
}

module.exports = fetchAllIngredients;