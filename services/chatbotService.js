const { addHistory, getHistory, deleteHistory } = require('../model/chatbotHistory');
const { ServiceError } = require('./serviceError');
const { fetchJson } = require('./httpClientService');

const CHATBOT_CHAT_URL =
  process.env.AI_CHATBOT_CHAT_URL ||
  'http://localhost:8000/ai-model/chatbot/chat';

const CHATBOT_ADD_URLS_BASE =
  process.env.AI_CHATBOT_ADD_URLS_URL ||
  'http://localhost:8000/ai-model/chatbot/add_urls';

class ChatbotService {
  async getChatResponse({ userId, userInput }, options = {}) {
    if (!userId || !userInput) {
      throw new ServiceError(400, 'Missing required fields: user_id and user_input are required');
    }

    if (typeof userInput !== 'string' || userInput.trim().length === 0) {
      throw new ServiceError(400, 'Invalid input: user_input must be a non-empty string');
    }

    let responseText = `I understand you're asking about "${userInput}". How can I help you with that?`;

    try {
      const { data } = await fetchJson(
        CHATBOT_CHAT_URL,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: userInput })
        },
        options.fetch
      );

      if (data && data.msg) {
        responseText = data.msg;
      }
    } catch (error) {
      console.error('Error connecting to AI server:', error);
    }

    try {
      await addHistory(userId, userInput, responseText);
    } catch (error) {
      console.error('Error storing chat history:', error);
    }

    return {
      statusCode: 200,
      body: {
        message: 'Success',
        response_text: responseText
      }
    };
  }

  async addUrl(urls, options = {}) {
    if (!urls) {
      throw new ServiceError(400, 'Invalid input data, urls not found');
    }

    try {
      const { data } = await fetchJson(
        `${CHATBOT_ADD_URLS_BASE}?urls=${urls}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        },
        options.fetch
      );

      if (!data) {
        throw new ServiceError(400, 'An error occurred when fetching result from AI server');
      }

      return {
        statusCode: 200,
        body: {
          message: 'Success',
          result: data
        }
      };
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }

      throw new ServiceError(503, 'AI server unavailable');
    }
  }

  async addPdf() {
    return {
      statusCode: 200,
      body: {
        message: 'Success',
        result: 'This is dummy response'
      }
    };
  }

  async getChatHistory(userId) {
    if (!userId) {
      throw new ServiceError(400, 'Missing required field: user_id is required');
    }

    const history = await getHistory(userId);

    if (!history) {
      throw new ServiceError(404, 'No chat history found for this user');
    }

    return {
      statusCode: 200,
      body: {
        message: 'Chat history retrieved successfully',
        chat_history: history
      }
    };
  }

  async clearChatHistory(userId) {
    if (!userId) {
      throw new ServiceError(400, 'Missing required field: user_id is required');
    }

    await deleteHistory(userId);

    return {
      statusCode: 200,
      body: {
        message: 'Chat history cleared successfully'
      }
    };
  }
}

module.exports = {
  ChatbotService,
  chatbotService: new ChatbotService()
};
