const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const { ServiceError } = require('../services/serviceError');

describe('AI controller service boundaries', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('delegates medical prediction requests to medicalPredictionService', async () => {
    const medicalPredictionService = {
      predict: sinon.stub().resolves({
        statusCode: 200,
        body: {
          survey_id: null,
          medical_report: { bmi: 24.5 }
        }
      })
    };

    const controller = proxyquire('../controller/medicalPredictionController', {
      '../services/medicalPredictionService': { medicalPredictionService }
    });

    const req = { body: { Gender: 'male', Age: 30 } };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };

    await controller.predict(req, res);

    expect(medicalPredictionService.predict.calledOnceWith(req.body)).to.equal(true);
    expect(res.status.calledWith(200)).to.equal(true);
    expect(res.json.calledWith({
      survey_id: null,
      medical_report: { bmi: 24.5 }
    })).to.equal(true);
  });

  it('delegates chatbot requests to chatbotService and preserves fallback responses', async () => {
    const chatbotService = {
      getChatResponse: sinon.stub().resolves({
        statusCode: 200,
        body: {
          message: 'Success',
          response_text: 'Fallback'
        }
      })
    };

    const controller = proxyquire('../controller/chatbotController', {
      '../services/chatbotService': { chatbotService }
    });

    const req = { body: { user_id: 1, user_input: 'Hello' } };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };

    await controller.getChatResponse(req, res);

    expect(chatbotService.getChatResponse.calledOnceWith({
      userId: 1,
      userInput: 'Hello'
    })).to.equal(true);
    expect(res.status.calledWith(200)).to.equal(true);
    expect(res.json.calledWith({
      message: 'Success',
      response_text: 'Fallback'
    })).to.equal(true);
  });

  it('maps chatbot service validation failures into stable HTTP errors', async () => {
    const chatbotService = {
      getChatHistory: sinon.stub().rejects(new ServiceError(400, 'Missing required field: user_id is required'))
    };

    const controller = proxyquire('../controller/chatbotController', {
      '../services/chatbotService': { chatbotService }
    });

    const req = { body: {} };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };

    await controller.getChatHistory(req, res);

    expect(res.status.calledWith(400)).to.equal(true);
    expect(res.json.calledWith({
      error: 'Missing required field: user_id is required'
    })).to.equal(true);
  });
});
