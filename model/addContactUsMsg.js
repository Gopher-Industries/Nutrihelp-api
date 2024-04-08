const supabase = require('../dbConnection.js');

async function addContactUsMsg(name, email, message) {
    try {
        let { data, error } = await supabase
            .from('contactus')
            .insert({ name: name, email: email, message: message })
        return data
    } catch (error) {
        throw error;
    }
}

module.exports = addContactUsMsg;