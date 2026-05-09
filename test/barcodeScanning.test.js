const { expect } = require('chai');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

describe('barcodeScanningController', () => {
  function resMock() {
    return {
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

  it('returns the shared scan contract for a barcode scan without user context', async () => {
    const model = {
      fetchBarcodeInformation: sinon.stub().resolves({
        success: true,
        data: {
          product: {
            product_name: 'Test Product',
            allergens_from_ingredients: ['milk'],
            ingredients_text_en: 'Milk, Sugar, Cocoa',
          },
        },
      }),
      getUserAllergen: sinon.stub(),
    };

    const controller = proxyquire('../controller/barcodeScanningController', {
      '../model/getBarcodeAllergen': model,
    });

    const req = { body: {}, query: { code: '93613903' } };
    const res = resMock();

    await controller.checkAllergen(req, res);

    expect(res.statusCode).to.equal(200);
    expect(res.payload.success).to.equal(true);
    expect(res.payload.meta.contractVersion).to.equal('v1');
    expect(res.payload.data.scan.type).to.equal('barcode');
    expect(res.payload.data.scan.item.name).to.equal('Test Product');
    expect(res.payload.data.scan.query.barcode).to.equal('93613903');
    expect(res.payload.data.scan.allergens.detectedIngredients).to.include('milk');
    expect(res.payload.data.scan.allergens.hasMatch).to.equal(false);
    expect(res.payload.data.productName).to.equal('Test Product');
  });

  it('returns matching allergens in the shared scan contract when user context exists', async () => {
    const model = {
      fetchBarcodeInformation: sinon.stub().resolves({
        success: true,
        data: {
          product: {
            product_name: 'Test Product',
            allergens_from_ingredients: ['milk'],
            ingredients_text_en: 'Milk, Sugar, Cocoa',
          },
        },
      }),
      getUserAllergen: sinon.stub().resolves(['milk']),
    };

    const controller = proxyquire('../controller/barcodeScanningController', {
      '../model/getBarcodeAllergen': model,
    });

    const req = { body: { user_id: 1 }, query: { code: '93613903' } };
    const res = resMock();

    await controller.checkAllergen(req, res);

    expect(res.statusCode).to.equal(200);
    expect(res.payload.data.scan.allergens.hasMatch).to.equal(true);
    expect(res.payload.data.scan.allergens.matchingIngredients).to.deep.equal(['milk']);
    expect(res.payload.data.detectionResult.hasUserAllergen).to.equal(true);
  });

  it('returns BARCODE_REQUIRED when no barcode is provided', async () => {
    const controller = proxyquire('../controller/barcodeScanningController', {
      '../model/getBarcodeAllergen': {
        fetchBarcodeInformation: sinon.stub(),
        getUserAllergen: sinon.stub(),
      },
    });

    const req = { body: {}, query: {} };
    const res = resMock();

    await controller.checkAllergen(req, res);

    expect(res.statusCode).to.equal(400);
    expect(res.payload.success).to.equal(false);
    expect(res.payload.code).to.equal('BARCODE_REQUIRED');
  });

  it('returns SCAN_NOT_FOUND when the barcode lookup fails', async () => {
    const controller = proxyquire('../controller/barcodeScanningController', {
      '../model/getBarcodeAllergen': {
        fetchBarcodeInformation: sinon.stub().resolves({ success: false, data: null }),
        getUserAllergen: sinon.stub(),
      },
    });

    const req = { body: {}, query: { code: '0000000000000' } };
    const res = resMock();

    await controller.checkAllergen(req, res);

    expect(res.statusCode).to.equal(404);
    expect(res.payload.success).to.equal(false);
    expect(res.payload.code).to.equal('SCAN_NOT_FOUND');
  });
});
