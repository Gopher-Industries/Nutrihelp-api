const { expect } = require('chai');
const express = require('express');
const http = require('http');
const request = require('supertest');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

function buildApp(route) {
  const app = express();
  app.use(express.json());
  app.use(route);
  return app;
}

async function canBindLocalPort() {
  const server = http.createServer((_, res) => res.end('ok'));
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => {
        server.removeListener('error', reject);
        resolve();
      });
    });
    return true;
  } catch (error) {
    if (error && error.code === 'EPERM') {
      return false;
    }
    throw error;
  } finally {
    if (server.listening) {
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }
}

async function withServer(app, run) {
  const server = http.createServer(app);

  await new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  try {
    return await run(server);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

describe('scan routes contract (supertest)', () => {
  before(async function () {
    if (!(await canBindLocalPort())) {
      this.skip();
    }
  });

  afterEach(() => sinon.restore());

  it('POST /barcode returns the shared scan contract', async () => {
    const barcodeRoute = proxyquire('../routes/barcodeScanning', {
      '../controller/barcodeScanningController': proxyquire('../controller/barcodeScanningController', {
        '../model/getBarcodeAllergen': {
          fetchBarcodeInformation: sinon.stub().resolves({
            success: true,
            data: {
              product: {
                product_name: 'Test Product',
                allergens_from_ingredients: ['milk'],
                ingredients_text_en: 'Milk, Sugar',
              },
            },
          }),
          getUserAllergen: sinon.stub().resolves(['milk']),
        },
      }),
    });

    const app = buildApp(barcodeRoute);
    const res = await withServer(app, (server) => request(server)
      .post('/')
      .query({ code: '1234567890' })
      .send({ user_id: 1 }));

    expect(res.status).to.equal(200);
    expect(res.body.success).to.equal(true);
    expect(res.body.data.scan.type).to.equal('barcode');
    expect(res.body.data.scan.query.barcode).to.equal('1234567890');
    expect(res.body.data.scan.allergens.matchingIngredients).to.deep.equal(['milk']);
  });

  it('POST /imageClassification returns the shared scan contract', async () => {
    const imageController = proxyquire('../controller/imageClassificationController', {
      fs: {
        promises: { readFile: sinon.stub().resolves(Buffer.from('image-data')) },
        unlink: sinon.stub().callsFake((_, cb) => cb && cb(null)),
      },
      '../services/imageClassificationGateway': {
        classify: sinon.stub().resolves({
          ok: true,
          httpStatus: 200,
          data: {
            classification: {
              label: 'Banana',
              rawLabel: 'Banana:~89 calories per 100 grams',
              calories: { value: 89, unit: 'kcal/100g' },
              confidence: 0.93,
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
              durationMs: 25,
              confidence: 0.93,
              confidenceThreshold: 0.6,
              warnings: [],
              generatedAt: new Date().toISOString(),
              contractVersion: 'v1',
            },
          },
        }),
      },
    });

    const imageRoute = proxyquire('../routes/imageClassification', {
      '../controller/imageClassificationController.js': imageController,
    });

    const app = buildApp(imageRoute);
    const res = await withServer(app, (server) => request(server)
      .post('/')
      .attach('image', Buffer.from('fake-image-bytes'), {
        filename: 'banana.png',
        contentType: 'image/png',
      }));

    expect(res.status).to.equal(200);
    expect(res.body.success).to.equal(true);
    expect(res.body.data.scan.type).to.equal('image');
    expect(res.body.data.scan.entity).to.equal('food');
    expect(res.body.data.scan.classification.label).to.equal('Banana');
  });

  it('POST /recipeImageClassification returns the shared scan contract', async () => {
    const recipeController = proxyquire('../controller/recipeImageClassificationController', {
      fs: {
        promises: { unlink: sinon.stub().resolves() },
        existsSync: sinon.stub().returns(true),
      },
      '../services/aiExecutionService': {
        executePythonScript: sinon.stub().resolves({
          success: true,
          prediction: 'Lasagna',
          confidence: 0.84,
          metadata: { source: 'recipe-image-script', durationMs: 120 },
          warnings: [],
        }),
      },
    });

    const recipeRoute = proxyquire('../routes/recipeImageClassification', {
      '../controller/recipeImageClassificationController.js': recipeController,
    });

    const app = buildApp(recipeRoute);
    const res = await withServer(app, (server) => request(server)
      .post('/')
      .attach('image', Buffer.from('fake-image-bytes'), {
        filename: 'recipe.jpg',
        contentType: 'image/jpeg',
      }));

    expect(res.status).to.equal(200);
    expect(res.body.success).to.equal(true);
    expect(res.body.data.scan.type).to.equal('image');
    expect(res.body.data.scan.entity).to.equal('recipe');
    expect(res.body.data.scan.classification.label).to.equal('Lasagna');
  });

  it('POST /recipeImageClassification returns validation envelope on bad mime type', async () => {
    const recipeRoute = proxyquire('../routes/recipeImageClassification', {});
    const app = buildApp(recipeRoute);

    const res = await withServer(app, (server) => request(server)
      .post('/')
      .attach('image', Buffer.from('not-image'), {
        filename: 'bad.txt',
        contentType: 'text/plain',
      }));

    expect(res.status).to.equal(400);
    expect(res.body.success).to.equal(false);
    expect(res.body.code).to.equal('VALIDATION_ERROR');
    expect(res.body.errors).to.be.an('array');
  });
});
