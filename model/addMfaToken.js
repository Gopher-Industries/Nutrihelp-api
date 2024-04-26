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

async function verifyMfaToken(userId, token) {
    try {
        
        let { data, error } = await supabase
            .from('mfatokens')
            .select('id, user_id, token, is_used, expiry')
            .eq('token', token)
            .eq('user_id', userId)
            .eq('is_used', false);

        const mfaToken = data[0]; 
        if (!mfaToken || !mfaToken.id) return false;
     
        await supabase
            .from('mfatokens')
            .update({ is_used: true })
            .in('token', data.map(tokenData => tokenData.token));

        const currentDate = new Date();
        const expiryDate = new Date(mfaToken.expiry);
        if (currentDate > expiryDate) return false
        return true;
    } catch (error) {
        console.log(error);
        throw error;
    }
}

module.exports = {addMfaToken, verifyMfaToken};