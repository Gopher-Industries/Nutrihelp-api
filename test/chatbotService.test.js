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
      expect(error.message).to.equal('Missing user_input');
    }
  });

  it('injects profile preferences into nutrition prompts before calling the AI service', async () => {
    const getCanonicalProfile = sinon.stub().resolves({
      profile: {
        user_id: 1,
        firstName: 'Liam',
        email: 'liam@example.com'
      },
      preferenceSummary: {
        dietaryRequirements: ['low sodium'],
        allergies: ['peanut'],
        cuisines: ['vietnamese'],
        dislikes: ['apple cider vinegar'],
        healthConditions: ['high blood pressure'],
        spiceLevels: ['mild'],
        cookingMethods: ['steamed']
      }
    });

    const { ChatbotService } = proxyquire('../services/chatbotService', {
      './userProfileService': {
        getCanonicalProfile
      }
    });

    const aiResponse = 'For dinner, try a low-sodium Vietnamese-style rice bowl with steamed fish and vegetables.';
    const service = new ChatbotService();
    const fetchStub = sinon.stub().resolves({
      ok: true,
      text: sinon.stub().resolves(JSON.stringify({ msg: aiResponse }))
    });

    const result = await service.getChatResponse(
      { userId: 1, userInput: 'What should I eat for dinner?' },
      { fetch: fetchStub }
    );

    expect(result.statusCode).to.equal(200);
    expect(result.body.response).to.equal(aiResponse);
    expect(result.body.personalization.applied).to.equal(true);
    expect(getCanonicalProfile.calledOnceWith({ userId: 1 })).to.equal(true);

    const prompt = JSON.parse(fetchStub.firstCall.args[1].body).query;
    expect(prompt).to.include('User question:');
    expect(prompt).to.include('What should I eat for dinner?');
    expect(prompt).to.include('Allergies and intolerances: peanut');
    expect(prompt).to.include('Disliked ingredients: apple cider vinegar');
    expect(prompt).to.include('Health conditions: high blood pressure');
    expect(prompt).to.include('Include a short safety note');
  });

  it('leaves non-nutrition prompts to the existing AI domain guard without profile context', async () => {
    const getCanonicalProfile = sinon.stub().resolves({});
    const { ChatbotService } = proxyquire('../services/chatbotService', {
      './userProfileService': {
        getCanonicalProfile
      }
    });

    const service = new ChatbotService();
    const fetchStub = sinon.stub().resolves({
      ok: true,
      text: sinon.stub().resolves(JSON.stringify({ msg: 'Fallback response' }))
    });

    const result = await service.getChatResponse(
      { userId: 1, userInput: 'Tell me about JavaScript closures' },
      { fetch: fetchStub }
    );

    expect(result.statusCode).to.equal(200);
    expect(result.body.personalization.applied).to.equal(false);
    expect(getCanonicalProfile.notCalled).to.equal(true);
    expect(JSON.parse(fetchStub.firstCall.args[1].body).query).to.equal('Tell me about JavaScript closures');
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
