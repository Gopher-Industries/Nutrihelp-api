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

  it('maps wrapper timeout into a backend-friendly timeout response', async () => {
    const executePythonScript = sinon.stub().resolves({
      success: false,
      prediction: null,
      confidence: null,
      error: 'AI script timed out after 30000ms',
      timedOut: true
    });

    sinon.stub(fs, 'existsSync').returns(true);
    sinon.stub(fs.promises, 'copyFile').resolves();
    sinon.stub(fs, 'writeFile').callsFake((filePath, content, callback) => callback(null));
    sinon.stub(fs, 'unlink').callsFake((filePath, callback) => callback(null));

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
    expect(res.statusCode).to.equal(504);
    expect(res.payload).to.deep.equal({
      success: false,
      prediction: null,
      confidence: null,
      error: 'AI script timed out after 30000ms'
    });
  });
});
