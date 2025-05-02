const bcrypt = require('bcryptjs');
let getUser = require('../model/getUser.js');
let addUser = require('../model/addUser.js');
const { validationResult } = require('express-validator');
const { registerValidation } = require('../validators/signupValidator.js');

const signup = async (req, res) => {
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, contact_number, address } = req.body;

    try {
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
