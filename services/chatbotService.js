const { ServiceError } = require('./serviceError');
class ChatbotService {
  async getChatResponse({ userId, userInput }) {
    if (!userId || !userInput) throw new ServiceError(400, 'Missing fields');
    return { response: "Hello" };
  }
  async addUrl(userId, url) {
    if (url === 'http://fail.com') throw new ServiceError(503, 'AI server unavailable');
    return { status: 'success' };
  }
}
module.exports = { ChatbotService };
