const supabase = require('../dbConnection.js');

async function getUserProfile(email) {
    try {
        let { data, error } = await supabase
            .from('users')
            .select('user_id,name,first_name,last_name,email,contact_number,mfa_enabled,address')
            .eq('email', email)
        return data
    } catch (error) {
        throw error;
    }

}

module.exports = getUserProfile;