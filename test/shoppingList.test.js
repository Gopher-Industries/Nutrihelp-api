require("dotenv").config();
const request = require("supertest");
const BASE_URL = "http://localhost:80";

const supabase = require("../dbConnection.js");

// Mock Supabase methods for testing
jest.mock("../dbConnection.js", () => ({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
}));

describe("Shopping List API", () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // -------------------------
    // Ingredient Options
    // -------------------------
    // it("GET /ingredient-options should return 400 if name not provided", async () => {
    //     const res = await request(BASE_URL).get("/api/shopping-list/ingredient-options");
    //     expect(res.statusCode).toBe(400);
    //     expect(res.body.error).toMatch(/ingredient name parameter is required/i);
    // });

    it("GET /ingredient-options should return 200 with formatted data", async () => {
        supabase.select.mockResolvedValueOnce({ data: [{ id: 1, ingredient_id: 1, name: "Milk", unit: 1, measurement: "litre", price: 3, store_id: 1, ingredients: { name: "Milk", category: "Dairy" } }], error: null });

        const res = await request(BASE_URL).get("/api/shopping-list/ingredient-options").query({ name: "Milk" });
        expect(res.statusCode).toBe(200);
        expect(res.body.data[0].ingredient_name).toBe("Milk");
    });

    // -------------------------
    // Generate From Meal Plan
    // -------------------------
    it("POST /from-meal-plan should return 400 if required fields missing", async () => {
        const res = await request(BASE_URL).post("/api/shopping-list/from-meal-plan").send({});
        expect(res.statusCode).toBe(400);
    });

    it("POST /from-meal-plan should return 404 if no meal plans found", async () => {
        supabase.select.mockResolvedValueOnce({ data: [], error: null });

        const res = await request(BASE_URL)
            .post("/api/shopping-list/from-meal-plan")
            .send({ user_id: 1, meal_plan_ids: [1, 2] });
        expect(res.statusCode).toBe(404);
        expect(res.body.error).toMatch(/no meal plans found/i);
    });

    // -------------------------
    // Create Shopping List
    // -------------------------
    it("POST / should return 400 if required fields missing", async () => {
        const res = await request(BASE_URL).post("/api/shopping-list").send({});
        expect(res.statusCode).toBe(400);
    });

    // it("POST / should return 201 on successful creation", async () => {
    //     supabase.insert.mockResolvedValueOnce({ data: { id: 1, user_id: 1, name: "Weekly groceries" }, error: null });
    //     supabase.insert.mockResolvedValueOnce({ data: [{ id: 1, ingredient_id: 1 }], error: null });

    //     const res = await request(BASE_URL)
    //         .post("/api/shopping-list")
    //         .send({ user_id: 1, name: "Weekly groceries", items: [{ ingredient_id: 1, ingredient_name: "Milk" }] });
    //     expect(res.statusCode).toBe(201);
    //     expect(res.body.data.shopping_list.name).toBe("Weekly groceries");
    // });

    // -------------------------
    // Get Shopping List
    // -------------------------
    it("GET / should return 400 if user_id missing", async () => {
        const res = await request(BASE_URL).get("/api/shopping-list");
        expect(res.statusCode).toBe(400);
    });

    // it("GET / should return 200 with user's shopping lists", async () => {
    //     supabase.select.mockResolvedValueOnce({ data: [{ id: 1, name: "Weekly groceries" }], error: null });
    //     supabase.select.mockResolvedValueOnce({ data: [{ id: 1, ingredient_name: "Milk", purchased: false }], error: null });

    //     const res = await request(BASE_URL).get("/api/shopping-list").query({ user_id: 1 });
    //     expect(res.statusCode).toBe(200);
    //     expect(res.body.data[0].items[0].ingredient_name).toBe("Milk");
    // });

    // -------------------------
    // Add Shopping List Item
    // -------------------------
    it("POST /items should return 400 if shopping_list_id or ingredient_name missing", async () => {
        const res = await request(BASE_URL).post("/api/shopping-list/items").send({});
        expect(res.statusCode).toBe(400);
    });

    it("POST /items should return 201 on successful item addition", async () => {
        supabase.insert.mockResolvedValueOnce({ data: { id: 1, ingredient_name: "Milk" }, error: null });
        const res = await request(BASE_URL)
            .post("/api/shopping-list/items")
            .send({ shopping_list_id: 1, ingredient_name: "Milk" });
        expect(res.statusCode).toBe(201);
        expect(res.body.data.ingredient_name).toBe("Milk");
    });

    // -------------------------
    // Update Shopping List Item
    // -------------------------
    // it("PATCH /items/:id should return 200 on update", async () => {
    //     supabase.update.mockResolvedValueOnce({ data: { id: 1, purchased: true }, error: null });
    //     const res = await request(BASE_URL)
    //         .patch("/api/shopping-list/items/1")
    //         .send({ purchased: true });
    //     expect(res.statusCode).toBe(200);
    //     expect(res.body.data.purchased).toBe(true);
    // });

    // -------------------------
    // Delete Shopping List Item
    // -------------------------
    it("DELETE /items/:id should return 204 on deletion", async () => {
        supabase.delete.mockResolvedValueOnce({ data: null, error: null });
        const res = await request(BASE_URL).delete("/api/shopping-list/items/1");
        expect(res.statusCode).toBe(204);
    });

});
