const express = require('express')
const router = express.Router()

const authController = require('../controller/authController')

router.post('/log-login-attempt', authController.logLoginAttempt)
router.post('/send-sms-by-email', authController.sendSMSByEmail);

module.exports = router
