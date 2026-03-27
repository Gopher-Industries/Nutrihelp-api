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
      },
    };
  }

  function stubFileCleanup() {
    sinon.stub(fs, 'unlink').callsFake((filePath, callback) => callback(null));
    sinon.stub(fs.promises, 'unlink').resolves();
  }

  afterEach(() => {
    sinon.restore();
  });

  it('maps wrapper success into a normalized image classification response', async () => {
    const executePythonScript = sinon.stub().resolves({
      success: true,
      prediction: 'banana',
      confidence: 0.87,
      error: null,
    });

    const readFileStub = sinon.stub(fs.promises, 'readFile').resolves(Buffer.from('image-data'));
    stubFileCleanup();

    const controller = proxyquire('../controller/imageClassificationController', {
      '../services/aiExecutionService': { executePythonScript },
    });

    const req = {
      file: { path: 'uploads/test.png' },
    };
    const res = createResponseMock();

    await controller.predictImage(req, res);

    expect(readFileStub.calledOnce).to.equal(true);
    expect(executePythonScript.calledOnce).to.equal(true);
    expect(executePythonScript.firstCall.args[0].scriptPath).to.match(
      /model\/imageClassification\.py$/
    );
    expect(executePythonScript.firstCall.args[0].stdin).to.deep.equal(Buffer.from('image-data'));
    expect(res.statusCode).to.equal(200);
    expect(res.payload).to.deep.equal({
      success: true,
      prediction: 'banana',
      confidence: 0.87,
      error: null,
    });
  });

  it('maps wrapper failures into a stable image classification error response', async () => {
    const executePythonScript = sinon.stub().resolves({
      success: false,
      prediction: null,
      confidence: null,
      error: 'model failure',
      timedOut: false,
    });

    sinon.stub(fs.promises, 'readFile').resolves(Buffer.from('image-data'));
    stubFileCleanup();

    const controller = proxyquire('../controller/imageClassificationController', {
      '../services/aiExecutionService': { executePythonScript },
    });

    const req = {
      file: { path: 'uploads/test.png' },
    };
    const res = createResponseMock();

    await controller.predictImage(req, res);

    expect(executePythonScript.calledOnce).to.equal(true);
    expect(executePythonScript.firstCall.args[0].scriptPath).to.match(
      /model\/imageClassification\.py$/
    );
    expect(executePythonScript.firstCall.args[0].stdin).to.deep.equal(Buffer.from('image-data'));
    expect(res.statusCode).to.equal(500);
    expect(res.payload).to.deep.equal({
      success: false,
      prediction: null,
      confidence: null,
      error: 'model failure',
    });
  });

  it('returns 400 when no image file is uploaded for image classification', async () => {
    const executePythonScript = sinon.stub();
    stubFileCleanup();

    const controller = proxyquire('../controller/imageClassificationController', {
      '../services/aiExecutionService': { executePythonScript },
    });

    const req = {};
    const res = createResponseMock();

    await controller.predictImage(req, res);

    expect(executePythonScript.called).to.equal(false);
    expect(res.statusCode).to.equal(400);
    expect(res.payload).to.deep.equal({
      success: false,
      prediction: null,
      confidence: null,
      error: 'No image uploaded. Please upload a JPEG or PNG image.',
    });
  });

  it('maps wrapper timeout into a backend-friendly timeout response', async () => {
    const executePythonScript = sinon.stub().resolves({
      success: false,
      prediction: null,
      confidence: null,
      error: 'AI script timed out after 30000ms',
      timedOut: true,
    });

    sinon.stub(fs, 'existsSync').returns(true);
    stubFileCleanup();

    const controller = proxyquire('../controller/recipeImageClassificationController', {
      '../services/aiExecutionService': { executePythonScript },
    });

    const req = {
      file: {
        path: 'uploads/temp/test.png',
        originalname: 'test.png',
      },
    };
    const res = createResponseMock();

    await controller.predictRecipeImage(req, res);

    expect(executePythonScript.calledOnce).to.equal(true);
    expect(executePythonScript.firstCall.args[0].args).to.deep.equal([
      'uploads/temp/test.png',
      'test.png',
    ]);
    expect(res.statusCode).to.equal(504);
    expect(res.payload).to.deep.equal({
      success: false,
      prediction: null,
      confidence: null,
      error: 'AI script timed out after 30000ms',
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
        model_used: false,
      },
      warnings: ['low_confidence_fallback', 'heuristic_prediction'],
    });

    sinon.stub(fs, 'existsSync').returns(true);
    stubFileCleanup();

    const controller = proxyquire('../controller/recipeImageClassificationController', {
      '../services/aiExecutionService': { executePythonScript },
    });

    const req = {
      file: {
        path: 'uploads/temp/test.png',
        originalname: 'test.png',
      },
    };
    const res = createResponseMock();

    await controller.predictRecipeImage(req, res);

    expect(executePythonScript.calledOnce).to.equal(true);
    expect(executePythonScript.firstCall.args[0].args).to.deep.equal([
      'uploads/temp/test.png',
      'test.png',
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
        model_used: false,
      },
      warnings: ['low_confidence_fallback', 'heuristic_prediction'],
    });
  });
});
