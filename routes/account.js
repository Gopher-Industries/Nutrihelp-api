const express = require('express');
const router = express.Router();
const controller = require("../controller/accountController");
const { authenticateToken } = require('../middleware/authenticateToken');

router.route('/').get(authenticateToken, controller.getAllAccount);

module.exports = router;
