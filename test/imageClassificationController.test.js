/**
 * imageClassificationController.test.js
 *
 * Exercises the controller end-to-end with the gateway stubbed out, so
 * we're really testing the HTTP contract surface:
 *   • success → ok()  with { data: { classification, explainability } }
 *   • gateway error  → fail() with { success: false, error, code }
 *   • missing file   → 400 IMAGE_MISSING
 */

const fs = require('fs');
const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

describe('imageClassificationController', () => {
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
      locals: {},
    };
  }

  function stubFileIo() {
    sinon.stub(fs.promises, 'readFile').resolves(Buffer.from('image-data'));
    sinon.stub(fs, 'unlink').callsFake((_, cb) => cb && cb(null));
  }

  afterEach(() => sinon.restore());

  it('returns the normalised success envelope on AI success', async () => {
    stubFileIo();

    const gateway = {
      classify: sinon.stub().resolves({
        ok: true,
        httpStatus: 200,
        data: {
          classification: {
            label: 'Banana',
            rawLabel: 'Banana:~89 calories per 100 grams',
            calories: { value: 89, unit: 'kcal/100g' },
            confidence: 0.91,
            uncertain: false,
            source: 'ai',
            fallbackUsed: false,
            alternatives: [],
          },
          explainability: {
            service: 'image_classification',
            source: 'ai',
            fallbackUsed: false,
            timedOut: false,
            circuitOpen: false,
            durationMs: 42,
            confidence: 0.91,
            confidenceThreshold: 0.6,
            warnings: [],
            generatedAt: new Date().toISOString(),
            contractVersion: 'v1',
          },
        },
      }),
    };

    const controller = proxyquire('../controller/imageClassificationController', {
      '../services/imageClassificationGateway': gateway,
    });

    const req = { file: { path: 'uploads/test.png' } };
    const res = resMock();

    await controller.predictImage(req, res);

    expect(gateway.classify.calledOnce).to.equal(true);
    expect(res.statusCode).to.equal(200);
    expect(res.payload.success).to.equal(true);
    expect(res.payload.data.classification.label).to.equal('Banana');
    expect(res.payload.data.classification.source).to.equal('ai');
    expect(res.payload.data.classification.uncertain).to.equal(false);
    expect(res.payload.data.explainability.contractVersion).to.equal('v1');
  });

  it('returns 503 with the shared error envelope when the gateway reports unavailable', async () => {
    stubFileIo();

    const gateway = {
      classify: sinon.stub().resolves({
        ok: false,
        httpStatus: 503,
        code: 'AI_SERVICE_UNAVAILABLE',
        error: 'Image classification is temporarily unavailable. Please try again.',
      }),
    };

    const controller = proxyquire('../controller/imageClassificationController', {
      '../services/imageClassificationGateway': gateway,
    });

    const req = { file: { path: 'uploads/test.png' } };
    const res = resMock();

    await controller.predictImage(req, res);

    expect(res.statusCode).to.equal(503);
    expect(res.payload.success).to.equal(false);
    expect(res.payload.code).to.equal('AI_SERVICE_UNAVAILABLE');
    expect(res.payload.error).to.be.a('string');
  });

  it('returns 400 IMAGE_MISSING when no file is present on the request', async () => {
    const gateway = { classify: sinon.stub() };

    const controller = proxyquire('../controller/imageClassificationController', {
      '../services/imageClassificationGateway': gateway,
    });

    const req = {};
    const res = resMock();

    await controller.predictImage(req, res);

    expect(gateway.classify.called).to.equal(false);
    expect(res.statusCode).to.equal(400);
    expect(res.payload.success).to.equal(false);
    expect(res.payload.code).to.equal('IMAGE_MISSING');
  });
});
