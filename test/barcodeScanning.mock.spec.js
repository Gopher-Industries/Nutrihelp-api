require("dotenv").config();
const proxyquire = require("proxyquire");

const testUserId = 1;
const validBarcode = "93613903";
const invalidBarcode = "0000000000000";

const barcodeModel = {
  fetchBarcodeInformation: jest.fn(),
  getUserAllergen: jest.fn(),
};

const controller = proxyquire("../controller/barcodeScanningController", {
  "../model/getBarcodeAllergen": barcodeModel,
});

function createResponseDouble() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe("Barcode Scanning API Mock", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 200 and barcode info without user_id", async () => {
    barcodeModel.fetchBarcodeInformation.mockResolvedValue({
      success: true,
      data: {
        product: {
          product_name: "Test Product",
          allergens_from_ingredients: ["milk"],
          ingredients_text_en: "Milk, Sugar, Cocoa",
        },
      },
    });

    const req = {
      body: {},
      query: { code: validBarcode },
    };
    const res = createResponseDouble();
    await controller.checkAllergen(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.product_name).toBe("Test Product");
    expect(res.body.detection_result).toEqual({});
    expect(Array.isArray(res.body.barcode_ingredients)).toBe(true);
    expect(res.body.user_allergen_ingredients).toEqual([]);
  });

  it("should return 200 and compare allergens when user_id is provided", async () => {
    barcodeModel.fetchBarcodeInformation.mockResolvedValue({
      success: true,
      data: {
        product: {
          product_name: "Test Product",
          allergens_from_ingredients: ["milk"],
          ingredients_text_en: "Milk, Sugar, Cocoa",
        },
      },
    });
    barcodeModel.getUserAllergen.mockResolvedValue(["milk"]);

    const req = {
      body: { user_id: testUserId },
      query: { code: validBarcode },
    };
    const res = createResponseDouble();
    await controller.checkAllergen(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.product_name).toBe("Test Product");
    expect(res.body.detection_result.hasUserAllergen).toBe(true);
    expect(res.body.detection_result.matchingAllergens).toContain("milk");
    expect(res.body.user_allergen_ingredients).toContain("milk");
  });

  it("should return 404 if barcode is invalid", async () => {
    barcodeModel.fetchBarcodeInformation.mockResolvedValue({
      success: false,
      data: null,
    });

    const req = {
      body: {},
      query: { code: invalidBarcode },
    };
    const res = createResponseDouble();
    await controller.checkAllergen(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/invalid barcode/i);
  });

  it("should return 404 if barcode info not found", async () => {
    barcodeModel.fetchBarcodeInformation.mockResolvedValue({
      success: true,
      data: { product: null },
    });

    const req = {
      body: {},
      query: { code: validBarcode },
    };
    const res = createResponseDouble();
    await controller.checkAllergen(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/barcode information not found/i);
  });

  it("should return 500 if fetchBarcodeInformation throws an error", async () => {
    barcodeModel.fetchBarcodeInformation.mockRejectedValue(new Error("API Error"));

    const req = {
      body: {},
      query: { code: validBarcode },
    };
    const res = createResponseDouble();
    await controller.checkAllergen(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/internal server error/i);
  });

  it("should return 500 if getUserAllergen throws an error", async () => {
    barcodeModel.fetchBarcodeInformation.mockResolvedValue({
      success: true,
      data: {
        product: {
          product_name: "Test Product",
          allergens_from_ingredients: ["milk"],
          ingredients_text_en: "Milk, Sugar, Cocoa",
        },
      },
    });
    barcodeModel.getUserAllergen.mockRejectedValue(new Error("DB Error"));

    const req = {
      body: { user_id: testUserId },
      query: { code: validBarcode },
    };
    const res = createResponseDouble();
    await controller.checkAllergen(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/internal server error/i);
  });
});
