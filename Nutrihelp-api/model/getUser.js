const supabase = require('../dbConnection.js');

async function getUser(email) {
    try {
        let { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
        return data
    } catch (error) {
        throw error;
    }
}

module.exports = getUser;