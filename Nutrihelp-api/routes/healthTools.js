const express = require('express');
const router = express.Router();
const controller = require("../controller/healthToolsController");

router.get("/bmi",controller.getBmi)

module.exports = router; 