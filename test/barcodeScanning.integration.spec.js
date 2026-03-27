require("dotenv").config();
const request = require("supertest");

describe("Barcode Scanning API Integration", function () {
  this.timeout(15000);

  it("should return product data from the real barcode API for a valid barcode", async () => {
    const res = await request("http://localhost:80")
      .post("/api/barcode")
      .query({ code: "3017624010701" });

    expect(res.statusCode).toBe(200);
    expect(typeof res.body.product_name).toBe("string");
    expect(Array.isArray(res.body.barcode_ingredients)).toBe(true);
    expect(res.body.detection_result).toEqual({});
    expect(res.body.user_allergen_ingredients).toEqual([]);
  });

  it("should return 404 for an invalid barcode from the real barcode API", async () => {
    const res = await request("http://localhost:80")
      .post("/api/barcode")
      .query({ code: "0000000000000" });

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/invalid barcode|barcode information not found/i);
  });
});
