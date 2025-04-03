require("dotenv").config();
const chai = require("chai");
const chaiHttp = require("chai-http");
const { expect } = chai;
chai.use(chaiHttp);

// Tests may not work if the table data is updated
// => Remove all equal assertions
describe("Cost Estimation: Test valid recipe", () => {
    it("should return 200, return minimum/maximum cost and ingredients for recipe 261", (done) => {
      const recipe_id = 261;  
      chai.request("http://localhost:80")
            .get(`/api/recipe/cost/${recipe_id}`)
            .send()
            .end((err, res) => {
                if (err) return done(err);
                expect(res).to.have.status(200);
                expect(res.body)
                    .to.have.all.keys(
                      'minimum_cost', 
                      'maximum_cost',
                      'include_all_ingredients',
                      'low_cost_ingredients',
                      'high_cost_ingredients');
                expect(res.body.minimum_cost).to.equal(18);
                expect(res.body.maximum_cost).to.equal(42);
                expect(res.body.include_all_ingredients).to.equal(true);
                done();
            });
    });
    it("should return 200, return minimum/maximum cost and ingredients for recipe 262", (done) => {
      const recipe_id = 262;  
      chai.request("http://localhost:80")
            .get(`/api/recipe/cost/${recipe_id}`)
            .send()
            .end((err, res) => {
                if (err) return done(err);
                expect(res).to.have.status(200);
                expect(res.body)
                    .to.have.all.keys(
                      'minimum_cost', 
                      'maximum_cost',
                      'include_all_ingredients',
                      'low_cost_ingredients',
                      'high_cost_ingredients');
                expect(res.body.minimum_cost).to.equal(28);
                expect(res.body.maximum_cost).to.equal(39);
                expect(res.body.include_all_ingredients).to.equal(true);
                done();
            });
    });
});

describe("Cost Estimation: Test invalid recipe", () => {
  it("should return 404 for invalid recipe", (done) => {
    const recipe_id = 11111;  
    chai.request("http://localhost:80")
          .get(`/api/recipe/cost/${recipe_id}`)
          .send()
          .end((err, res) => {
              if (err) return done(err);
              expect(res).to.have.status(404);
              expect(res.body)
                .to.have.property("error")
                .that.equals("Invalid recipe id, ingredients not found");
              done();
          });
  });
});

describe("Cost Estimation: Test valid recipe with invalid ingredients", () => {
  it("should return 404 for ingredient not found in store", (done) => {
    const recipe_id = 267;  
    chai.request("http://localhost:80")
          .get(`/api/recipe/cost/${recipe_id}`)
          .send()
          .end((err, res) => {
              if (err) return done(err);
              expect(res).to.have.status(404);
              expect(res.body)
                .to.have.property("error")
                .that.equals("There was an error in estimation process");
              done();
          });
  });

  it("should return 404 for ingredient measurement not match any product in store", (done) => {
    const recipe_id = 25;  
    chai.request("http://localhost:80")
          .get(`/api/recipe/cost/${recipe_id}`)
          .send()
          .end((err, res) => {
              if (err) return done(err);
              expect(res).to.have.status(404);
              expect(res.body)
                .to.have.property("error")
                .that.equals("There was an error in estimation process");
              done();
          });
  });

  it("should return 404 for null ingredients", (done) => {
    const recipe_id = 19;  
    chai.request("http://localhost:80")
          .get(`/api/recipe/cost/${recipe_id}`)
          .send()
          .end((err, res) => {
              if (err) return done(err);
              expect(res).to.have.status(404);
              expect(res.body)
                .to.have.property("error")
                .that.equals("Recipe contains invalid ingredients data, can not estimate cost");
              done();
          });
  });
});