const fs = require('fs');
const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

describe('AI Controllers', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('maps wrapper success into a normalized image classification response', async () => {
    const executePythonScript = sinon.stub().resolves({
      success: true,
      prediction: 'banana',
      confidence: 0.87,
      error: null
    });

    const readFileStub = sinon.stub(fs.promises, 'readFile').resolves(Buffer.from('image-data'));
    sinon.stub(fs, 'unlink').callsFake((filePath, callback) => callback(null));

    const controller = proxyquire('../controller/imageClassificationController', {
      '../services/aiExecutionService': { executePythonScript }
    });

    const req = {
      file: { path: 'uploads/test.png' }
    };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };

    await controller.predictImage(req, res);

    expect(readFileStub.calledOnce).to.equal(true);
    expect(executePythonScript.calledOnce).to.equal(true);
    expect(res.status.calledWith(200)).to.equal(true);
    expect(res.json.calledWith({
      success: true,
      prediction: 'banana',
      confidence: 0.87,
      error: null
    })).to.equal(true);
  });

  it('maps wrapper failures into a stable image classification error response', async () => {
    const executePythonScript = sinon.stub().resolves({
      success: false,
      prediction: null,
      confidence: null,
      error: 'model failure',
      timedOut: false
    });

    sinon.stub(fs.promises, 'readFile').resolves(Buffer.from('image-data'));
    sinon.stub(fs, 'unlink').callsFake((filePath, callback) => callback(null));

    const controller = proxyquire('../controller/imageClassificationController', {
      '../services/aiExecutionService': { executePythonScript }
    });

    const req = {
      file: { path: 'uploads/test.png' }
    };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };

    await controller.predictImage(req, res);

    expect(res.status.calledWith(500)).to.equal(true);
    expect(res.json.calledWith({
      success: false,
      prediction: null,
      confidence: null,
      error: 'model failure'
    })).to.equal(true);
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
    sinon.stub(fs.promises, 'unlink').resolves();

    const controller = proxyquire('../controller/recipeImageClassificationController', {
      '../services/aiExecutionService': { executePythonScript }
    });

    const req = {
      file: {
        path: 'uploads/temp/test.png',
        originalname: 'test.png'
      }
    };
    const res = {
      headersSent: false,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.payload = payload;
        return this;
      }
    };

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
    sinon.stub(fs.promises, 'unlink').resolves();

    const controller = proxyquire('../controller/recipeImageClassificationController', {
      '../services/aiExecutionService': { executePythonScript }
    });

    const req = {
      file: {
        path: 'uploads/temp/test.png',
        originalname: 'test.png'
      }
    };
    const res = {
      headersSent: false,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.payload = payload;
        return this;
      }
    };

    await controller.predictRecipeImage(req, res);

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
