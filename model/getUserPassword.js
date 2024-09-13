const supabase = require('../dbConnection.js');

async function getUserProfile(user_id) {
    try {
        let { data, error } = await supabase
            .from('users')
            .select('user_id,password')
            .eq('user_id', user_id)
        return data
    } catch (error) {
        throw error;
    }

}

module.exports = getUserProfile;