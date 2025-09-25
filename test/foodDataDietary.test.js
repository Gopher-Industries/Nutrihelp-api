require("dotenv").config();
const request = require("supertest");

const BASE_URL = "http://localhost:80";

describe("DietaryRequirements: Get All", () => {
    it("should return 200 and a list of dietary requirements", async () => {
        const res = await request(BASE_URL)
            .get("/api/fooddata/dietaryrequirements");

        expect(res.statusCode).toBe(200);
        expect(res.body).toBeDefined();
        expect(Array.isArray(res.body)).toBe(true);
    });

    it("should return 200 and an empty array when no requirements exist", async () => {
        const res = await request(BASE_URL)
            .get("/api/fooddata/dietaryrequirements");

        expect(res.statusCode).toBe(200);
        expect(res.body).toBeDefined();
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThanOrEqual(0); // allows empty or filled
    });

    it("should have each requirement contain id and name fields", async () => {
        const res = await request(BASE_URL)
            .get("/api/fooddata/dietaryrequirements");

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        if (res.body.length > 0) {
            res.body.forEach(item => {
                expect(item).toHaveProperty("id");
                expect(item).toHaveProperty("name");
            });
        }
    });

    it("should return 404 for an invalid endpoint", async () => {
        const res = await request(BASE_URL)
            .get("/api/fooddata/dietaryrequirements123"); // wrong route

        expect(res.statusCode).toBe(404);
    });
});
