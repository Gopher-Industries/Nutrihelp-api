const express = require('express');
const router = express.Router();
const controller = require("../controller/accountController");

router.route('/').get(controller.getAllAccount);

module.exports = router;