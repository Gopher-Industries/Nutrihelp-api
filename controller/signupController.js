// dbClient = require('../dbConnection.js');
const bcrypt = require('bcryptjs');

const signup = async (req, res) => {
    const { username, password } = req.body;

    try {
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const userExists = await getUser(username);
        if (userExists) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await addUser(username, hashedPassword);

        res.status(201).json({ message: 'User created successfully' });

    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getUser = async (username) => {
    //Add db query to check for user
}

const addUser = async (username, password) => {
    //Add db query add user to table
}


module.exports = { signup };