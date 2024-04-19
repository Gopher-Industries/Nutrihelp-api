const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
let getUserCredentials = require('../model/getUserCredentials.js');
let addMfaToken = require('../model/addMfaToken.js');
const sgMail = require('@sendgrid/mail');


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
       

        if (user.mfa_enabled) {
            let token = Math.floor(100000 + Math.random() * 900000);

            addMfaToken(user.user_id, token);

            await sendEmail(user);
            return res.status(200).json({ message: 'An MFA Token has been sent to your email address', token: token });
            //Create and Send out MFA Token
        }


        const token = jwt.sign({ userId: user.user_id }, process.env.JWT_TOKEN, { expiresIn: '1h' });

        return res.status(200).json({ token });
    } catch (error) {
        console.error('Error logging in:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const loginMfa = async (req, res) => {
    const { username, password, token } = req.body;
    
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

async function sendEmail(user) {
     console.log(user)
     sgMail.setApiKey(process.env.SENDGRID_KEY);
    try {
        // Define the email content
        const msg = {
        to: user.username, // Replace with recipient's email
        from: 'estudley@deakin.edu.au', // Replace with sender's email
        subject: 'Test Email from Node.js',
        text: 'This is a test email sent from Node.js using SendGrid!',
        html: '<strong>This is a test email sent from Node.js using SendGrid!</strong>',
        };

        // Send the email
        await sgMail.send(msg);

        console.log('Email sent successfully!');
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

module.exports = { login, loginMfa };