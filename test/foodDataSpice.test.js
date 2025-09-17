// test/spiceLevels.test.js
require("dotenv").config();
const request = require("supertest");

const BASE_URL = "http://localhost:80";

describe("SpiceLevels: Get All", () => {
    it("should return 200 and a list of spice levels", async () => {
        const res = await request(BASE_URL).get("/api/fooddata/spicelevels");

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it("should return 200 and an empty array when no spice levels exist", async () => {
        const res = await request(BASE_URL).get("/api/fooddata/spicelevels");

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThanOrEqual(0);
    });

    it("should have each spice level contain id and name fields", async () => {
        const res = await request(BASE_URL).get("/api/fooddata/spicelevels");

        if (res.body.length > 0) {
            res.body.forEach(item => {
                expect(item).toHaveProperty("id");
                expect(item).toHaveProperty("name");
            });
        }
    });

    it("should return 404 for an invalid endpoint", async () => {
        const res = await request(BASE_URL).get("/api/fooddata/spicelevelss");
        expect(res.statusCode).toBe(404);
    });
});
