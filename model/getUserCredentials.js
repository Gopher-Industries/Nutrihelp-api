const supabase = require('../dbConnection.js');

async function getUserCredentials(email) {
    try {
        let { data, error } = await supabase
            .from('users')
            .select('user_id,email,password,mfa_enabled')
            .eq('email', email)
        return data[0]
    } catch (error) {
        throw error;
    }

}

module.exports = getUserCredentials;