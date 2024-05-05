const supabase = require('../dbConnection.js');

async function addContactUsMsg(name, email, subject, message) {
    try {
        let { data, error } = await supabase
            .from('contactus')
            .insert({ name: name, email: email, subject:subject, message: message })
        return data
    } catch (error) {
        throw error;
    }
}

module.exports = addContactUsMsg;