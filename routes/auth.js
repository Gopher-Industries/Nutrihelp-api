const express = require('express')
const router = express.Router()

const authController = require('../controller/authController')

router.post('/log-login-attempt', authController.logLoginAttempt)

module.exports = router
