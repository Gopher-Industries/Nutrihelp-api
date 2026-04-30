const fs = require('fs');
const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

describe('AI Controllers', () => {
  function createResponseMock() {
    return {
      headersSent: false,
      statusCode: null,
      payload: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.payload = payload;
        return this;
      }
    };
  }

  function stubFileCleanup() {
    sinon.stub(fs, 'unlink').callsFake((filePath, callback) => callback(null));
    sinon.stub(fs.promises, 'unlink').resolves();
  }

  afterEach(() => {
    sinon.restore();
  });

  // NOTE: the image-classification controller now speaks the normalised
  // response contract (see services/imageClassificationContract.js).  The
  // three tests below were rewritten to assert the new envelope shape —
  // the richer gateway-level coverage lives in imageClassificationGateway.test.js
  // and imageClassificationController.test.js.
  it('wraps gateway success in the normalised response envelope', async () => {
    const classify = sinon.stub().resolves({
      ok: true,
      httpStatus: 200,
      data: {
        classification: {
          label: 'Banana',
          rawLabel: 'Banana:~89 calories per 100 grams',
          calories: { value: 89, unit: 'kcal/100g' },
          confidence: 0.87,
          uncertain: false,
          source: 'ai',
          fallbackUsed: false,
          alternatives: []
        },
        explainability: {
          service: 'image_classification',
          source: 'ai',
          fallbackUsed: false,
          timedOut: false,
          circuitOpen: false,
          durationMs: 10,
          confidence: 0.87,
          confidenceThreshold: 0.6,
          warnings: [],
          generatedAt: new Date().toISOString(),
          contractVersion: 'v1'
        }
      }
    });

    const readFileStub = sinon.stub(fs.promises, 'readFile').resolves(Buffer.from('image-data'));
    stubFileCleanup();

    const controller = proxyquire('../controller/imageClassificationController', {
      '../services/imageClassificationGateway': { classify }
    });

    const req = { file: { path: 'uploads/test.png' } };
    const res = createResponseMock();

    await controller.predictImage(req, res);

    expect(readFileStub.calledOnce).to.equal(true);
    expect(classify.calledOnce).to.equal(true);
    expect(res.statusCode).to.equal(200);
    expect(res.payload.success).to.equal(true);
    expect(res.payload.data.classification.label).to.equal('Banana');
    expect(res.payload.data.classification.source).to.equal('ai');
    expect(res.payload.data.classification.uncertain).to.equal(false);
  });

  it('wraps gateway failures in the normalised error envelope', async () => {
    const classify = sinon.stub().resolves({
      ok: false,
      httpStatus: 503,
      code: 'AI_SERVICE_UNAVAILABLE',
      error: 'Image classification is temporarily unavailable. Please try again.'
    });

    sinon.stub(fs.promises, 'readFile').resolves(Buffer.from('image-data'));
    stubFileCleanup();

    const controller = proxyquire('../controller/imageClassificationController', {
      '../services/imageClassificationGateway': { classify }
    });

    const req = { file: { path: 'uploads/test.png' } };
    const res = createResponseMock();

    await controller.predictImage(req, res);

    expect(classify.calledOnce).to.equal(true);
    expect(res.statusCode).to.equal(503);
    expect(res.payload.success).to.equal(false);
    expect(res.payload.code).to.equal('AI_SERVICE_UNAVAILABLE');
    expect(res.payload.error).to.be.a('string');
  });

  it('returns 400 IMAGE_MISSING when no image file is uploaded', async () => {
    const classify = sinon.stub();
    stubFileCleanup();

    const controller = proxyquire('../controller/imageClassificationController', {
      '../services/imageClassificationGateway': { classify }
    });

    const req = {};
    const res = createResponseMock();

    await controller.predictImage(req, res);

    expect(classify.called).to.equal(false);
    expect(res.statusCode).to.equal(400);
    expect(res.payload.success).to.equal(false);
    expect(res.payload.code).to.equal('IMAGE_MISSING');
  });

  it('maps wrapper timeout into a backend-friendly timeout response', async () => {
    const executePythonScript = sinon.stub().resolves({
      success: false,
      prediction: null,
      confidence: null,
      error: 'AI script timed out after 30000ms',
      timedOut: true
    });

    sinon.stub(fs, 'existsSync').returns(true);
    stubFileCleanup();

    const controller = proxyquire('../controller/recipeImageClassificationController', {
      '../services/aiExecutionService': { executePythonScript }
    });

    const req = {
      file: {
        path: 'uploads/temp/test.png',
        originalname: 'test.png'
      }
    };
    const res = createResponseMock();

    await controller.predictRecipeImage(req, res);

    expect(executePythonScript.calledOnce).to.equal(true);
    expect(executePythonScript.firstCall.args[0].args).to.deep.equal([
      'uploads/temp/test.png',
      'test.png'
    ]);
    expect(res.statusCode).to.equal(504);
    expect(res.payload).to.deep.equal({
      success: false,
      prediction: null,
      confidence: null,
      error: 'AI script timed out after 30000ms'
    });
  });

  it('surfaces heuristic recipe classifier metadata to the caller', async () => {
    const executePythonScript = sinon.stub().resolves({
      success: true,
      prediction: 'sushi',
      confidence: 0.15,
      error: null,
      metadata: {
        classifier_type: 'heuristic',
        decision_source: 'deterministic_fallback',
        model_used: false
      },
      warnings: ['low_confidence_fallback', 'heuristic_prediction']
    });

    sinon.stub(fs, 'existsSync').returns(true);
    stubFileCleanup();

    const controller = proxyquire('../controller/recipeImageClassificationController', {
      '../services/aiExecutionService': { executePythonScript }
    });

    const req = {
      file: {
        path: 'uploads/temp/test.png',
        originalname: 'test.png'
      }
    };
    const res = createResponseMock();

    await controller.predictRecipeImage(req, res);

    expect(executePythonScript.calledOnce).to.equal(true);
    expect(executePythonScript.firstCall.args[0].args).to.deep.equal([
      'uploads/temp/test.png',
      'test.png'
    ]);
    expect(res.statusCode).to.equal(200);
    expect(res.payload).to.deep.equal({
      success: true,
      prediction: 'sushi',
      confidence: 0.15,
      error: null,
      metadata: {
        classifier_type: 'heuristic',
        decision_source: 'deterministic_fallback',
        model_used: false
      },
      warnings: ['low_confidence_fallback', 'heuristic_prediction']
    });
  });
});
