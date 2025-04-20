const express = require("express");
const router  = express.Router();
const controller = require('../controller/contactusController.js');

// Import the validation rule and middleware
const { contactusValidator } = require('../validators/contactusValidator.js');
const validate = require('../middleware/validateRequest.js');

// Apply validation before the controller
router.route('/').post(contactusValidator, validate, (req,res) => {
    controller.contactus(req, res);
});

module.exports = router;