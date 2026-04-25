/**
 * MockChatbotClient.js
 * 
 * Mock chatbot client for development and testing.
 * Provides consistent, predictable responses without external dependencies.
 */

const ChatbotAIClientInterface = require('../interfaces/ChatbotAIClientInterface');

class MockChatbotClient extends ChatbotAIClientInterface {
  constructor(config = {}) {
    super(config);
    this.conversationHistories = new Map(); // userId -> history[]
  }

  async generateResponse(request, options = {}) {
    const validation = this.validateRequest(request, ['query']);
    if (!validation.valid) {
      return this.errorResponse(new Error(validation.error));
    }

    const { query, userId } = request;
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Generate mock response based on query keywords
    let responseText = this.generateMockResponse(query);

    // Store in history if userId provided
    if (userId) {
      if (!this.conversationHistories.has(userId)) {
        this.conversationHistories.set(userId, []);
      }
      const history = this.conversationHistories.get(userId);
      history.push({ role: 'user', content: query });
      history.push({ role: 'assistant', content: responseText });
    }

    return this.successResponse({
      message: responseText,
      query: query
    }, {
      latencyMs: 100,
      metadata: {
        source: 'mock_chatbot',
        mockResponse: true,
        timestamp: new Date().toISOString()
      }
    });
  }

  generateMockResponse(query) {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('nutrition') || lowerQuery.includes('nutri')) {
      return 'Nutrition is important for maintaining a balanced diet. Make sure to include proteins, healthy fats, and carbohydrates in your meals.';
    }
    if (lowerQuery.includes('recipe') || lowerQuery.includes('cook')) {
      return 'I can help you find recipes! What ingredients do you have available, or what type of cuisine are you interested in?';
    }
    if (lowerQuery.includes('health') || lowerQuery.includes('fitness')) {
      return 'Good question about health! Remember to stay hydrated, exercise regularly, and eat a balanced diet. Would you like specific health recommendations?';
    }
    if (lowerQuery.includes('diet') || lowerQuery.includes('weight')) {
      return 'A healthy diet is key to wellness. Focus on whole foods, portion control, and balanced macronutrients. What are your specific dietary goals?';
    }

    return `I understand you're asking about "${query}". How can I help you further with nutritional or health-related information?`;
  }

  async getConversationHistory(userId, options = {}) {
    if (!userId) {
      return this.errorResponse(new Error('userId is required'));
    }

    const history = this.conversationHistories.get(userId) || [];

    return this.successResponse({
      userId,
      history,
      count: history.length
    }, {
      latencyMs: 50,
      metadata: {
        source: 'mock_chatbot'
      }
    });
  }

  async clearConversationHistory(userId) {
    if (!userId) {
      return this.errorResponse(new Error('userId is required'));
    }

    const hadHistory = this.conversationHistories.has(userId);
    this.conversationHistories.delete(userId);

    return this.successResponse({
      userId,
      cleared: true,
      hadHistory
    }, {
      latencyMs: 50
    });
  }

  async isHealthy() {
    return true; // Mock is always healthy
  }

  async getStatus() {
    return {
      serviceName: this.serviceName,
      type: 'mock',
      healthy: true,
      activeConversations: this.conversationHistories.size,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  MockChatbotClient
};
