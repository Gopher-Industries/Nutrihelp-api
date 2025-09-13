const express = require('express');
const router = express.Router();
const authController = require('../controller/smsController');

router.post('/send-sms-code', authController.sendSMSCode);

module.exports = router;
