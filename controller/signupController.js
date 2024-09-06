const bcrypt = require('bcryptjs');
let getUser = require('../model/getUser.js')
let addUser = require('../model/addUser.js')


const signup = async (req, res) => {
    const { name, email, password, contact_number, address } = req.body;

    try {
        if (!name || !email || !password || !contact_number || !address) {
            return res.status(400).json({ error: 'Name, email, password, contact number and address are required' });
        }

        const userExists = await getUser(email);

        if (userExists.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await addUser(name, email, hashedPassword, true, contact_number, address)

        return res.status(201).json({ message: 'User created successfully' });

    } catch (error) {
        console.error('Error creating user:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};


module.exports = { signup };