const express = require("express");
const router = express.Router();
const controller = require('../controller/contactusController.js');
const { formLimiter } = require('../middleware/rateLimiter'); 

router.post('/', formLimiter, function(req, res) {
    controller.contactus(req, res);
});

module.exports = router;