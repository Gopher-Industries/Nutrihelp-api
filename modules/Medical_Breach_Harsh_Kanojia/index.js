const express = require('express');
const router = express.Router();
const controller = require('./controller');

// Module Owner: Harsh Kanojia (Junior Cyber Security Lead)

router.post('/breach-check', controller.checkMedicalBreach);

module.exports = router;
