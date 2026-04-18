/**
 * ChatbotAIClientInterface.js
 * 
 * Interface for chatbot AI services.
 * Expected to handle conversational queries and return contextual responses.
 */

const AIClientInterface = require('./AIClientInterface');

class ChatbotAIClientInterface extends AIClientInterface {
  constructor(config = {}) {
    super('chatbot', config);
  }

  /**
   * Generate a chatbot response
   * @param {Object} request - Request object
   * @param {string} request.query - User query/message
   * @param {string} [request.userId] - User ID for context
   * @param {Array<Object>} [request.conversationHistory] - Previous messages for context
   * @param {AIRequestOptions} [options] - Additional request options
   * @returns {Promise<AIResponse>}
   */
  async generateResponse(request, options = {}) {
    throw new Error('generateResponse() must be implemented by subclass');
  }

  /**
   * Get conversation history for a user
   * @param {string} userId - The user ID
   * @param {Object} [options] - Query options (limit, offset, etc.)
   * @returns {Promise<AIResponse>}
   */
  async getConversationHistory(userId, options = {}) {
    throw new Error('getConversationHistory() must be implemented by subclass');
  }

  /**
   * Clear conversation history
   * @param {string} userId - The user ID
   * @returns {Promise<AIResponse>}
   */
  async clearConversationHistory(userId) {
    throw new Error('clearConversationHistory() must be implemented by subclass');
  }
}

module.exports = ChatbotAIClientInterface;
