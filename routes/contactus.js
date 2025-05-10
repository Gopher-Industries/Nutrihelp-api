const express = require("express");
const router = express.Router();
const controller = require('../controller/contactusController.js');

// Import the validation rule and middleware
const { contactusValidator } = require('../validators/contactusValidator.js');
const validate = require('../middleware/validateRequest.js');
const { formLimiter } = require('../middleware/rateLimiter'); // rate limiter added

// router.route('/').post(contactusValidator, validate, (req,res) => {
//     controller.contactus(req, res);
// });
// Apply rate limiter and validation before the controller
router.post('/', formLimiter, contactusValidator, validate, (req, res) => {
    controller.contactus(req, res);
});

module.exports = router;