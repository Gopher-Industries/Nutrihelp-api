const express = require('express');
const router = express.Router();
const { verifyEmail } = require('../controller/authController');

router.get('/verify-email', verifyEmail);

module.exports = router;
