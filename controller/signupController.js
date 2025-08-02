const bcrypt = require('bcryptjs');
let getUser = require('../model/getUser.js');
let addUser = require('../model/addUser.js');
const { validationResult } = require('express-validator');
const { registerValidation } = require('../validators/signupValidator.js');
const supabase = require('../dbConnection');

const signup = async (req, res) => {
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, contact_number, address } = req.body;

    const emailNormalized = email?.trim().toLowerCase();
    let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
    clientIp = clientIp === '::1' ? '127.0.0.1' : clientIp;
    const userAgent = req.get('User-Agent');

    try {
        const userExists = await getUser(email);

        if (userExists.length > 0) {
            // Log signup failure due to duplicate
            await supabase.from('audit_logs').insert([{
                user_id: null,
                event_type: 'SIGNUP_FAILED',
                ip_address: clientIp,
                user_agent: userAgent,
                details: { reason: 'User already exists', email: emailNormalized }
            }]);

            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const { user_id } = await addUser(name, emailNormalized, hashedPassword, true, contact_number, address);

        await addUser(name, email, hashedPassword, true, contact_number, address)

        // Log successful signup
        await supabase.from('audit_logs').insert([{
            user_id,
            event_type: 'SIGNUP_SUCCESS',
            ip_address: clientIp,
            user_agent: userAgent,
            details: { email: emailNormalized }
        }]);

        return res.status(201).json({ message: 'User created successfully' });

    } catch (error) {
        console.error('Error creating user:', error);

        // Log unexpected internal error
        await supabase.from('audit_logs').insert([{
            user_id: null,
            event_type: 'SIGNUP_FAILED',
            ip_address: clientIp,
            user_agent: userAgent,
            details: {
                reason: 'Internal server error',
                error_message: error.message,
                email: emailNormalized
            }
        }]);

        return res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { signup };
