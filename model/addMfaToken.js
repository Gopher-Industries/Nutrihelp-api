const supabase = require('../dbConnection.js');

async function addMfaToken(userId, token) {
    try {
       const currentDate = new Date();
        const expiryDate = new Date(currentDate.getTime() + 10 * 60000); // 10 minutes in milliseconds

        let { data, error } = await supabase
            .from('mfatokens')
            .insert({ user_id: userId, expiry: expiryDate.toISOString(), token: token });
        return data
    } catch (error) {
        console.log(error);
        throw error;
    }
}

module.exports = addMfaToken;