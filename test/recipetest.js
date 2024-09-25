require("dotenv").config();
const chai = require("chai");
const chaiHttp = require("chai-http");
const { expect } = chai;
const { addTestRecipe } = require("./test-helpers");
chai.use(chaiHttp);

before(async function () {
	testRecipe = await addTestRecipe();
});

describe("Recipe: Test createAndSaveRecipe - Parameters Are Missing", () => {
	it("should return 400, Recipe parameters are missing", (done) => {
		chai.request("http://localhost:80")
			.post("/api/recipe/createRecipe")
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

describe("Recipe: Test createAndSaveRecipe - Successfully created recipe", () => {
	it("should return 201, Successfully created recipe", (done) => {
		chai.request("http://localhost:80")
			.post("/api/recipe/createRecipe")
			.send({
				user_id: 1,
				ingredient_id: [14], //this needs to be an array
				ingredient_quantity: [2],
				recipe_name: "testrecipe",
				cuisine_id: 5,
				total_servings: 1,
				preparation_time: 1,
				instructions: "testinstructions",
				recipe_image: "",
				cooking_method_id: 1,
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
			.post("/api/recipe")
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

describe("Recipe: Test getRecipes - No recipes saved to user in database", () => {
	it("should return 404, Recipes not found", (done) => {
		chai.request("http://localhost:80")
			.post("/api/recipe")
			.send({
				user_id: "1",
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
			.post("/api/recipe")
			.send({
				user_id: "15",
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

describe("Recipe: Test deleteRecipe - Success", () => {
	it("should return 200, Success", (done) => {
		chai.request("http://localhost:80")
			.delete("/api/recipe")
			.send({
				user_id: "1",
				recipe_id: testRecipe.id,
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
