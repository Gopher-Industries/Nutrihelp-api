const supabase = require('../dbConnection.js');

async function deleteUser(user_id) {
    try {
        let { error } = await supabase
            .from('users')
            .delete()
            .eq('user_id', user_id)
        if (error) {
            throw new Error('Error deleting user')
        }
    } catch (error) {
        throw error;
    }
}

module.exports = deleteUser;