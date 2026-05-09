const { expect } = require('chai');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

describe('recipeImageClassificationController', () => {
  function resMock() {
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

  afterEach(() => sinon.restore());

  it('returns IMAGE_MISSING when no file is uploaded', async () => {
    const controller = proxyquire('../controller/recipeImageClassificationController', {
      fs: {
        promises: { unlink: sinon.stub().resolves() },
        existsSync: sinon.stub().returns(true),
      },
      '../services/aiExecutionService': {
        executePythonScript: sinon.stub(),
      },
    });

    const res = resMock();
    await controller.predictRecipeImage({}, res);

    expect(res.statusCode).to.equal(400);
    expect(res.payload.success).to.equal(false);
    expect(res.payload.code).to.equal('IMAGE_MISSING');
  });

  it('returns the shared scan contract for recipe image success', async () => {
    const executePythonScript = sinon.stub().resolves({
      success: true,
      prediction: 'Spaghetti Bolognese',
      confidence: 0.88,
      metadata: {
        source: 'recipe-image-script',
        durationMs: 123,
      },
      warnings: [],
    });

    const fsStub = {
      promises: { unlink: sinon.stub().resolves() },
      existsSync: sinon.stub().returns(true),
    };

    const controller = proxyquire('../controller/recipeImageClassificationController', {
      fs: fsStub,
      '../services/aiExecutionService': { executePythonScript },
    });

    const req = {
      file: {
        path: 'uploads/temp/test-image.jpg',
        originalname: 'test-image.jpg',
      },
    };
    const res = resMock();

    await controller.predictRecipeImage(req, res);

    expect(res.statusCode).to.equal(200);
    expect(res.payload.success).to.equal(true);
    expect(res.payload.meta.contractVersion).to.equal('v1');
    expect(res.payload.data.scan.type).to.equal('image');
    expect(res.payload.data.scan.entity).to.equal('recipe');
    expect(res.payload.data.scan.classification.label).to.equal('Spaghetti Bolognese');
    expect(res.payload.data.scan.classification.confidence).to.equal(0.88);
    expect(res.payload.data.scan.explainability.service).to.equal('recipe_image_classification');
  });

  it('returns SCAN_TIMEOUT when the recipe classifier times out', async () => {
    const controller = proxyquire('../controller/recipeImageClassificationController', {
      fs: {
        promises: { unlink: sinon.stub().resolves() },
        existsSync: sinon.stub().returns(true),
      },
      '../services/aiExecutionService': {
        executePythonScript: sinon.stub().resolves({
          success: false,
          timedOut: true,
          error: 'Timed out',
        }),
      },
    });

    const req = {
      file: {
        path: 'uploads/temp/test-image.jpg',
        originalname: 'test-image.jpg',
      },
    };
    const res = resMock();

    await controller.predictRecipeImage(req, res);

    expect(res.statusCode).to.equal(504);
    expect(res.payload.success).to.equal(false);
    expect(res.payload.code).to.equal('SCAN_TIMEOUT');
  });
});
