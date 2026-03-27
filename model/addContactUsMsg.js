const contactRepository = require('../repositories/contactRepository');

async function addContactUsMsg(name, email, subject, message) {
    return contactRepository.createContactUsMessage({ name, email, subject, message });
}

module.exports = addContactUsMsg;
