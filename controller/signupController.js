const bcrypt = require('bcryptjs');
let getUser = require('../model/getUser.js')
let addUser = require('../model/addUser.js')


const signup = async (req, res) => {
    const { username, password, email, contact_number } = req.body;

    try {
        if (!username || !password || !email || !contact_number) {
            return res.status(400).json({ error: 'Username, password, email and contact number are required' });
        }

        const userExists = await getUser(username);

        if (userExists.username) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await addUser(username, hashedPassword, email, contact_number)

        return res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        console.error('Error creating user:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};


module.exports = { signup };