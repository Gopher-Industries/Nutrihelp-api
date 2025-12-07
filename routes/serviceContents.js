const express = require('express');
const router = express.Router();
const { getServiceContents } = require('../controller/serviceContentController');

router.get('/', getServiceContents);

module.exports = router;
