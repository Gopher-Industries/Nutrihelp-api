const express = require('express');
const router = express.Router();
const uploadController = require('../controller/uploadController');

router.post('/', uploadController.uploadFile);

module.exports = router;
