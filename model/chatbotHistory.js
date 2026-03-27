const chatHistoryRepository = require('../repositories/chatHistoryRepository');

async function addHistory(user_id, user_input, chatbot_response) {
  try {
    return await chatHistoryRepository.createChatHistoryEntry({
      user_id,
      user_input,
      chatbot_response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[chatbotHistory] Failed to add chat history:', error);
    throw error;
  }
}

async function getHistory(user_id) {
  try {
    return await chatHistoryRepository.getChatHistoryByUserId(user_id);
  } catch (error) {
    console.error('[chatbotHistory] Failed to get chat history:', error);
    throw error;
  }
}

async function deleteHistory(user_id) {
  try {
    return await chatHistoryRepository.deleteChatHistoryByUserId(user_id);
  } catch (error) {
    console.error('[chatbotHistory] Failed to delete chat history:', error);
    throw error;
  }
}

module.exports = { addHistory, getHistory, deleteHistory };
