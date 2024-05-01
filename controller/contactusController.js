let addContactUsMsg = require("../model/addContactUsMsg.js");

const contactus = async (req, res) => {
    try {
        const {name, email, subject, message } = req.body;
        if (!name) {
            return res.status(400).send({ error: 'Name is required' });
        }

        if (!email) {
            return res.status(400).send({ error: 'Email is required' });
        }
        
        if (!subject) {
            return res.status(400).send({ error: 'Subject is required' });
        }

        if (!message) {
            return res.status(400).send({ error: 'Message is required' });
        }

        await addContactUsMsg(name, email, subject, message);

        return res.status(201).json({ message: 'Data received successfully!' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { contactus };