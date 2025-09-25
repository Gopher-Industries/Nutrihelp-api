const express = require('express');
const router = express.Router();
const smsController = require('../controller/smsController');

router.post('/send-sms-code', smsController.sendSMSCode);
router.post('/verify-sms-code', smsController.verifySMSCode);

module.exports = router;