require("dotenv").config();
const request = require("supertest");
const express = require("express");
const proxyquire = require("proxyquire");

const shoppingListRepository = {
  findIngredientOptionsByName: jest.fn(),
  findMealPlanIngredients: jest.fn(),
  findIngredientPricesByIngredientId: jest.fn(),
  createShoppingList: jest.fn(),
  createShoppingListItems: jest.fn(),
  deleteShoppingListById: jest.fn(),
  getShoppingListsByUserId: jest.fn(),
  getShoppingListItemsByListId: jest.fn(),
  updateShoppingListItemById: jest.fn(),
  addShoppingListItem: jest.fn(),
  deleteShoppingListItemById: jest.fn(),
};

const controller = proxyquire("../controller/shoppingListController", {
  "../repositories/shoppingListRepository": shoppingListRepository,
});

const {
  getIngredientOptionsValidation,
  generateFromMealPlanValidation,
  createShoppingListValidation,
  getShoppingListValidation,
  addShoppingListItemValidation,
  updateShoppingListItemValidation,
  deleteShoppingListItemValidation,
} = require("../validators/shoppingListValidator");
const validate = require("../middleware/validateRequest");

const app = express();
app.use(express.json());
app.get(
  "/api/shopping-list/ingredient-options",
  getIngredientOptionsValidation,
  validate,
  controller.getIngredientOptions,
);
app.post(
  "/api/shopping-list/from-meal-plan",
  generateFromMealPlanValidation,
  validate,
  controller.generateFromMealPlan,
);
app
  .route("/api/shopping-list")
  .post(createShoppingListValidation, validate, controller.createShoppingList)
  .get(getShoppingListValidation, validate, controller.getShoppingList);
app.post(
  "/api/shopping-list/items",
  addShoppingListItemValidation,
  validate,
  controller.addShoppingListItem,
);
app
  .route("/api/shopping-list/items/:id")
  .patch(updateShoppingListItemValidation, validate, controller.updateShoppingListItem)
  .delete(deleteShoppingListItemValidation, validate, controller.deleteShoppingListItem);

describe("Shopping List API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET /ingredient-options should return 200 with formatted data", async () => {
    shoppingListRepository.findIngredientOptionsByName.mockResolvedValue([
      {
        id: 1,
        ingredient_id: 1,
        name: "Milk",
        unit: 1,
        measurement: "litre",
        price: 3,
        store_id: 1,
        ingredients: { name: "Milk", category: "Dairy" },
      },
    ]);

    const res = await request(app)
      .get("/api/shopping-list/ingredient-options")
      .query({ name: "Milk" });

    expect(res.statusCode).toBe(200);
    expect(res.body.data[0].ingredient_name).toBe("Milk");
  });

  it("POST /from-meal-plan should return 400 if required fields missing", async () => {
    const res = await request(app)
      .post("/api/shopping-list/from-meal-plan")
      .send({});

    expect(res.statusCode).toBe(400);
  });

  it("POST /from-meal-plan should return 404 if no meal plans found", async () => {
    shoppingListRepository.findMealPlanIngredients.mockResolvedValue([]);

    const res = await request(app)
      .post("/api/shopping-list/from-meal-plan")
      .send({ user_id: 1, meal_plan_ids: [1, 2] });

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/no meal plans found/i);
  });

  it("POST / should return 400 if required fields missing", async () => {
    const res = await request(app).post("/api/shopping-list").send({});
    expect(res.statusCode).toBe(400);
  });

  it("GET / should return 400 if user_id missing", async () => {
    const res = await request(app).get("/api/shopping-list");
    expect(res.statusCode).toBe(400);
  });

  it("POST /items should return 400 if shopping_list_id or ingredient_name missing", async () => {
    const res = await request(app)
      .post("/api/shopping-list/items")
      .send({});

    expect(res.statusCode).toBe(400);
  });

  it("POST /items should return 201 on successful item addition", async () => {
    shoppingListRepository.addShoppingListItem.mockResolvedValue({
      id: 1,
      ingredient_name: "Milk",
    });

    const res = await request(app)
      .post("/api/shopping-list/items")
      .send({ shopping_list_id: 1, ingredient_name: "Milk" });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.ingredient_name).toBe("Milk");
  });

  it("DELETE /items/:id should return 204 on deletion", async () => {
    shoppingListRepository.deleteShoppingListItemById.mockResolvedValue(true);

    const res = await request(app).delete("/api/shopping-list/items/1");
    expect(res.statusCode).toBe(204);
  });
});
