const express = require('express');
const router = express.Router();
const chatbotController = require('../controller/chatbotController');

router.route('/query').post(chatbotController.getResponseText);

router.route('/history').post(chatbotController.getChatHistory);
router.route('/history').delete(chatbotController.clearChatHistory);

module.exports = router;
