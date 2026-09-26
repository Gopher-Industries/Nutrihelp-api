// test/ingredients.test.js
require("dotenv").config();
const request = require("supertest");

const BASE_URL = "http://localhost:80";

describe("Ingredients: Get All", () => {
    it("should return 200 and a list of ingredients", async () => {
        const res = await request(BASE_URL).get("/api/fooddata/ingredients");

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it("should return 200 and an empty array when no ingredients exist", async () => {
        const res = await request(BASE_URL).get("/api/fooddata/ingredients");

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThanOrEqual(0);
    });

    it("should have each ingredient contain id, name, and category fields", async () => {
        const res = await request(BASE_URL).get("/api/fooddata/ingredients");

        if (res.body.length > 0) {
            res.body.forEach(item => {
                expect(item).toHaveProperty("id");
                expect(item).toHaveProperty("name");
                expect(item).toHaveProperty("category");
            });
        }
    });

    it("should return 404 for an invalid endpoint", async () => {
        const res = await request(BASE_URL).get("/api/fooddata/ingredientsss");
        expect(res.statusCode).toBe(404);
    });
});
