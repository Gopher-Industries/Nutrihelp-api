const express = require('express');
const router = express.Router();
const { contentAndSupport } = require('../controller');

const { contactusValidator } = require('../validators/contactusValidator.js');
const { formLimiter } = require('../middleware/rateLimiter');

const { contact: controller } = contentAndSupport;

// The controller runs validationResult() itself and emits the standardized
// support envelope (utils/supportResponse). Skip the legacy validate
// middleware here so we don't fork the response shape.
router.post('/', formLimiter, contactusValidator, (req, res) => {
  controller.contactus(req, res);
});

module.exports = router;
