const express = require('express');
const router = express.Router();
const { aiAndMedical } = require('../controller');
const { authenticateToken } = require('../middleware/authenticateToken');

const { chatbot: chatbotController } = aiAndMedical;

router.route('/query').post(authenticateToken, chatbotController.getChatResponse);
router.route('/greeting').get(authenticateToken, chatbotController.getGreeting);

// router.route('/chat').post(chatbotController.getChatResponse);
router.route('/add_urls').post(chatbotController.addURL);
router.route('/add_pdfs').post(chatbotController.addPDF);

router.route('/history').post(authenticateToken, chatbotController.getChatHistory);
router.route('/history').delete(authenticateToken, chatbotController.clearChatHistory);

module.exports = router;
