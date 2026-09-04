const express = require('express');
const router = express.Router();
const uploadController = require('../controller/uploadController');
const { authenticateToken } = require('../middleware/authenticateToken');

router.post(
  '/',
  authenticateToken,
  uploadController.uploadFile
);

module.exports = router;
