const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
let getUserCredentials = require('../model/getUserCredentials.js');
let {addMfaToken, verifyMfaToken } = require('../model/addMfaToken.js');
const sgMail = require('@sendgrid/mail');


const login = async (req, res) => {
    const { username, password } = req.body;
    
    try {
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
         }
        const user = await getUserCredentials(username, password);
        if (!user || user.length === 0) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
       

        if (user.mfa_enabled) {
            let token = Math.floor(100000 + Math.random() * 900000);

            await addMfaToken(user.user_id, token);

            await sendEmail(user, token);
            return res.status(202).json({ message: 'An MFA Token has been sent to your email address' });
            
        }
        const token = jwt.sign({ userId: user.user_id }, process.env.JWT_TOKEN, { expiresIn: '1h' });

        return res.status(200).json({ token });
    } catch (error) {
        console.error('Error logging in:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const loginMfa = async (req, res) => {
    const { username, password, mfa_token } = req.body;
    
    try {
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
         if (!mfa_token) {
            return res.status(400).json({ error: 'Token is required' });
        }
        const user = await getUserCredentials(username, password);
        if (!user || user.length === 0) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const tokenValid = await verifyMfaToken(user.user_id, mfa_token);
        if (!tokenValid) return res.status(401).json({ error: 'Token is invalid or has expired' });           
       
        const token = jwt.sign({ userId: user.user_id }, process.env.JWT_TOKEN, { expiresIn: '1h' });

        return res.status(200).json({ token });
    } catch (error) {
        console.error('Error logging in:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

async function sendEmail(user, token) {
     sgMail.setApiKey(process.env.SENDGRID_KEY);
    try {
        // Define the email content
        const msg = {
        to: user.username,
        from: 'estudley@deakin.edu.au',
        subject: 'Nutrihelp login Token',
        text: `Your token to log in is ${token}`,
        html: `Your token to log in is ${token}`,
        };

        // Send the email
        await sgMail.send(msg);

        console.log('Email sent successfully!');
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

module.exports = { login, loginMfa };