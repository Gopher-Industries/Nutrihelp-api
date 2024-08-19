require("dotenv").config();
const chai = require("chai");
const chaiHttp = require("chai-http");
const { expect } = chai;
const getRecipes = require("../model/getUserRecipes");
chai.use(chaiHttp);

describe("Recipe: Test createAndSaveRecipe - Parameters Are Missing", () => {
    it("should return 400, Recipe parameters are missing", (done) => {
        chai.request("http://localhost:80")
            .post("/api/recipe")
            .send()
            .end((err, res) => {
                if (err) return done(err);
                expect(res).to.have.status(400);
                expect(res.body)
                    .to.have.property("error")
                    .that.equals("Recipe parameters are missed");
                done();
            });
    });
});

//this is not adding data to relation table, not sure why
describe("Recipe: Test createAndSaveRecipe - Successfully created recipe", () => {
    it("should return 201, Successfully created recipe", (done) => {
        chai.request("http://localhost:80")
            .post("/api/recipe")
            .send({
                user_id: 1,
                ingredient_id: [14], //this needs to be an array
                ingredient_quantity: [2],
                recipe_name: "testrecipe",
                cuisine_id: 5,
                total_servings: 1,
                preparation_time: 1,
                instructions: "testinstructions",
                recipe_image: ""
            })
            .end((err, res) => {
                if (err) return done(err);
                expect(res).to.have.status(201);
                expect(res.body)
                    .to.have.property("message")
                    .that.equals("success");
                done();
            });
    });
});

describe("Recipe: Test getRecipes - No UserId Entered", () => {
    it("should return 400, User Id is required", (done) => {
        chai.request("http://localhost:80")
            .get("/api/recipe")
            .send()
            .end((err, res) => {
                if (err) return done(err);
                expect(res).to.have.status(400);
                expect(res.body)
                    .to.have.property("error")
                    .that.equals("User Id is required");
                done();
            });
    });
});

//this only tests one case, need to also test recipes, ingredients, and cuisines not found
describe("Recipe: Test getRecipes - No recipes saved to user in database", () => {
    it("should return 404, Recipes not found", (done) => {
        chai.request("http://localhost:80")
            .get("/api/recipe")
            .send({
                user_id: "1"
            })
            .end((err, res) => {
                if (err) return done(err);
                expect(res).to.have.status(404);
                expect(res.body)
                    .to.have.property("error")
                    .that.equals("Recipes not found");
                done();
            });
    });
});

describe("Recipe: Test getRecipes - Success", () => {
    it("should return 200, Success", (done) => {
        chai.request("http://localhost:80")
            .get("/api/recipe")
            .send({
                user_id: "15"
            })
            .end((err, res) => {
                if (err) return done(err);
                expect(res).to.have.status(200);
                expect(res.body)
                    .to.have.property("message")
                    .that.equals("success");
                done();
            });
    });
});

describe("Recipe: Test deleteRecipe - User Id or Recipe Id not entered", () => {
    it("should return 400, User Id or Recipe Id is required", (done) => {

        chai.request("http://localhost:80")
            .delete("/api/recipe")
            .send()
            .end((err, res) => {
                if (err) return done(err);
                expect(res).to.have.status(400);
                expect(res.body)
                    .to.have.property("error")
                    .that.equals("User Id or Recipe Id is required");
                done();
            });
    });
});

//this is deleting the recipe created with the test previously
//test passes but its not getting deleted from the DB
//because previous test is not adding to the recipe ingredient table, so it cant get the id
describe("Recipe: Test deleteRecipe - Success", () => {
    //get recipe id for recipe created in previous test
    it("should return 200, Success", (done) => {
        chai.request("http://localhost:80")
            .delete("/api/recipe")
            .send({
                user_id: "1",
                recipe_id: getRecipeId()
            })
            .end((err, res) => {
                if (err) return done(err);
                expect(res).to.have.status(200);
                expect(res.body)
                    .to.have.property("message")
                    .that.equals("success");
                done();
            });
    });
});

async function getRecipeId() {
    let recipe = await getRecipes.getUserRecipesRelation(1);
    console.log(recipe);
    let id = recipe[0].recipe_id;
    return id;
}