const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const { ServiceError } = require('../services/serviceError');

describe('Chatbot service', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('rejects missing chat query fields before calling the AI service', async () => {
    const { ChatbotService } = require('../services/chatbotService');
    const service = new ChatbotService();

    try {
      await service.getChatResponse({ userId: null, userInput: '' });
      throw new Error('Expected getChatResponse to throw');
    } catch (error) {
      expect(error).to.be.instanceOf(ServiceError);
      expect(error.statusCode).to.equal(400);
      expect(error.message).to.equal('Missing required fields: user_id and user_input are required');
    }
  });

  it('falls back to a friendly response when the AI server is unavailable', async () => {
    const addHistory = sinon.stub().resolves();
    const { ChatbotService } = proxyquire('../services/chatbotService', {
      '../model/chatbotHistory': {
        addHistory,
        getHistory: sinon.stub(),
        deleteHistory: sinon.stub()
      }
    });

    const service = new ChatbotService();
    const fetchStub = sinon.stub().rejects(new Error('AI unavailable'));

    const result = await service.getChatResponse(
      { userId: 1, userInput: 'Hello' },
      { fetch: fetchStub }
    );

    expect(result.statusCode).to.equal(200);
    expect(result.body.response_text).to.equal('I understand you\'re asking about "Hello". How can I help you with that?');
    expect(addHistory.calledOnceWith(1, 'Hello', result.body.response_text)).to.equal(true);
  });

  it('maps add-url upstream failures to a 503 service error', async () => {
    const { ChatbotService } = require('../services/chatbotService');
    const service = new ChatbotService();
    const fetchStub = sinon.stub().rejects(new Error('down'));

    try {
      await service.addUrl('https://example.com', { fetch: fetchStub });
      throw new Error('Expected addUrl to throw');
    } catch (error) {
      expect(error).to.be.instanceOf(ServiceError);
      expect(error.statusCode).to.equal(503);
      expect(error.message).to.equal('AI server unavailable');
    }
  });
});
