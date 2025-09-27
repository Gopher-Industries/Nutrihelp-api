// ::: NOTE ::: //
// Currently the test cases are failing because it needs actual workflow to be added using a valid barcode

require("dotenv").config();
const request = require("supertest");
const BASE_URL = "http://localhost:80";

// Mock user and barcode data
const testUserId = 1;
const validBarcode = "93613903";
const invalidBarcode = "0000000000000";

// Mock modules
jest.mock("../model/getBarcodeAllergen", () => ({
  fetchBarcodeInformation: jest.fn(),
  getUserAllergen: jest.fn()
}));

const { fetchBarcodeInformation, getUserAllergen } = require("../model/getBarcodeAllergen");

describe("Barcode Scanning API", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 200 and barcode info without user_id", async () => {
    fetchBarcodeInformation.mockResolvedValue({
      success: true,
      data: {
        product: {
          product_name: "Test Product",
          allergens_from_ingredients: ["milk"],
          ingredients_text_en: "Milk, Sugar, Cocoa"
        }
      }
    });

    const res = await request(BASE_URL)
      .post("/api/barcode")
      .query({ code: validBarcode });

    expect(res.statusCode).toBe(200);
    expect(res.body.product_name).toBe("Test Product");
    expect(res.body.detection_result).toEqual({});
    expect(Array.isArray(res.body.barcode_ingredients)).toBe(true);
    expect(res.body.user_allergen_ingredients).toEqual([]);
  });

  it("should return 200 and compare allergens when user_id is provided", async () => {
    fetchBarcodeInformation.mockResolvedValue({
      success: true,
      data: {
        product: {
          product_name: "Test Product",
          allergens_from_ingredients: ["milk"],
          ingredients_text_en: "Milk, Sugar, Cocoa"
        }
      }
    });
    getUserAllergen.mockResolvedValue(["milk"]);

    const res = await request(BASE_URL)
      .post("/api/barcode")
      .query({ code: validBarcode })
      .send({ user_id: testUserId });

    expect(res.statusCode).toBe(200);
    expect(res.body.product_name).toBe("Test Product");
    expect(res.body.detection_result.hasUserAllergen).toBe(true);
    expect(res.body.detection_result.matchingAllergens).toContain("milk");
    expect(res.body.user_allergen_ingredients).toContain("milk");
  });

  it("should return 404 if barcode is invalid", async () => {
    fetchBarcodeInformation.mockResolvedValue({
      success: false,
      data: null
    });

    const res = await request(BASE_URL)
      .post("/api/barcode")
      .query({ code: invalidBarcode });

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/invalid barcode/i);
  });

  it("should return 404 if barcode info not found", async () => {
    fetchBarcodeInformation.mockResolvedValue({
      success: true,
      data: { product: null }
    });

    const res = await request(BASE_URL)
      .post("/api/barcode")
      .query({ code: validBarcode });

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/barcode information not found/i);
  });

  it("should return 500 if fetchBarcodeInformation throws an error", async () => {
    fetchBarcodeInformation.mockRejectedValue(new Error("API Error"));

    const res = await request(BASE_URL)
      .post("/api/barcode")
      .query({ code: validBarcode });

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/internal server error/i);
  });

  it("should return 500 if getUserAllergen throws an error", async () => {
    fetchBarcodeInformation.mockResolvedValue({
      success: true,
      data: {
        product: {
          product_name: "Test Product",
          allergens_from_ingredients: ["milk"],
          ingredients_text_en: "Milk, Sugar, Cocoa"
        }
      }
    });
    getUserAllergen.mockRejectedValue(new Error("DB Error"));

    const res = await request(BASE_URL)
      .post("/api/barcode")
      .query({ code: validBarcode })
      .send({ user_id: testUserId });

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/internal server error/i);
  });

});
