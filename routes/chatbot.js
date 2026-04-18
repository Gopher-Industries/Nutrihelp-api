const express = require('express');
const router = express.Router();
const chatbotController = require('../controller/chatbotController');

router.route('/query').post(chatbotController.getChatResponse);

// router.route('/chat').post(chatbotController.getChatResponse);
router.route('/add_urls').post(chatbotController.addURL);
router.route('/add_pdfs').post(chatbotController.addPDF);

router.route('/history').post(chatbotController.getChatHistory);
router.route('/history').delete(chatbotController.clearChatHistory);

module.exports = router;
