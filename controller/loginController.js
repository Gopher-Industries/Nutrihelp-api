const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
let getUserCredentials = require('../model/getUserCredentials.js')

const login = async (req, res) => {
    const { username, password } = req.body;
    
    try {
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
         }
        const user = await getUserCredentials(username, password);
        if (user.length === 0) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const token = jwt.sign({ userId: user.user_id }, process.env.JWT_TOKEN, { expiresIn: '1h' });

        return res.status(200).json({ token });
    } catch (error) {
        console.error('Error logging in:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { login };