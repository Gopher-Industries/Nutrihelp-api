require("dotenv").config();
const chai = require("chai");
const chaiHttp = require("chai-http");
const { expect } = chai;
chai.use(chaiHttp);

// Tests may not work if the table data is updated
// => Remove all equal assertions
describe("Test Full Cost Estimation", () => {

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
                      'info', 
                      'low_cost',
                      'high_cost');
                expect(res.body.info)
                    .to.have.all.keys(
                      'estimation_type',
                      'include_all_wanted_ingredients',
                      'minimum_cost',
                      'maximum_cost'
                    );
                expect(res.body.info.estimation_type).to.equal("full");
                expect(res.body.info.minimum_cost).to.equal(18);
                expect(res.body.info.maximum_cost).to.equal(42);
                expect(res.body.info.include_all_wanted_ingredients).to.equal(true);
                done();
            });
      });

      it("Testing the standard portion size for id 261, should return 200 and the value", (done) =>{
        const recipe_id = 261;
        const desired_servings = 4;
        chai.request("http://localhost:80")
            .get(`/api/recipe/cost/${recipe_id}?desirved_servings=${desired_servings}`)
            .send()
            .end((err,res) =>{
              if(err) return done(err);
              expect(res).to.have.status(200);
              expect(res.body)
                  .to.have.all.keys(
                    'info', 
                      'low_cost',
                      'high_cost');
              expect(res.body.info)
                  .to.have.all.keys(
                    'estimation_type',
                    'include_all_wanted_ingredients',
                    'minimum_cost',
                    'maximum_cost'
                  );
              expect(res.body.info.estimation_type).to.equal("full");
              expect(res.body.info.include_all_wanted_ingredients).to.equal(true);
              expect(res.body.info.minimum_cost).to.equal(18);
              expect(res.body.info.maximum_cost).to.equal(42);
              done();
            })
      });

      it("Testing the 3x the standard portion size for id 261, should return 200 and the value", (done) =>{
        const recipe_id = 261;
        const desired_servings = 12;
        chai.request("http://localhost:80")
            .get(`/api/recipe/cost/${recipe_id}?desired_servings=${desired_servings}`)
            .send()
            .end((err,res) =>{
              if(err) return done(err);
              expect(res).to.have.status(200);
              expect(res.body)
                  .to.have.all.keys(
                    'info', 
                      'low_cost',
                      'high_cost');
              expect(res.body.info)
                  .to.have.all.keys(
                    'estimation_type',
                    'include_all_wanted_ingredients',
                    'minimum_cost',
                    'maximum_cost'
                  );
              expect(res.body.info.estimation_type).to.equal("full");
              expect(res.body.info.include_all_wanted_ingredients).to.equal(true);
              expect(res.body.info.minimum_cost).to.equal(28);
              expect(res.body.info.maximum_cost).to.equal(49);
              console.log();
              done();
            })
      });

      it("Testing the 1/2 the standard portion size for id 261, should return 200 and the value", (done) =>{
        const recipe_id = 261;
        const desired_servings = 2;
        chai.request("http://localhost:80")
            .get(`/api/recipe/cost/${recipe_id}?desired_servings=${desired_servings}`)
            .send()
            .end((err,res) =>{
              if(err) return done(err);
              expect(res).to.have.status(200);
              expect(res.body)
                  .to.have.all.keys(
                    'info', 
                      'low_cost',
                      'high_cost');
              expect(res.body.info)
                  .to.have.all.keys(
                    'estimation_type',
                    'include_all_wanted_ingredients',
                    'minimum_cost',
                    'maximum_cost'
                  );
              expect(res.body.info.estimation_type).to.equal("full");
              expect(res.body.info.include_all_wanted_ingredients).to.equal(true);
              expect(res.body.info.minimum_cost).to.equal(18);
              expect(res.body.info.maximum_cost).to.equal(41);
              console.log();
              done();
            })
      });

      it("Testing the bulk portion size for id 261, should return 200 and the value", (done) =>{
        const recipe_id = 261;
        const desired_servings = 32;
        chai.request("http://localhost:80")
            .get(`/api/recipe/cost/${recipe_id}?desired_servings=${desired_servings}`)
            .send()
            .end((err,res) =>{
              if(err) return done(err);
              expect(res).to.have.status(200);
              expect(res.body)
                  .to.have.all.keys(
                    'info', 
                      'low_cost',
                      'high_cost');
              expect(res.body.info)
                  .to.have.all.keys(
                    'estimation_type',
                    'include_all_wanted_ingredients',
                    'minimum_cost',
                    'maximum_cost'
                  );
              expect(res.body.info.estimation_type).to.equal("full");
              expect(res.body.info.include_all_wanted_ingredients).to.equal(true);
              expect(res.body.info.minimum_cost).to.equal(58);
              expect(res.body.info.maximum_cost).to.equal();
              console.log();
              done();
            })
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
                        'info', 
                        'low_cost',
                        'high_cost');
                  expect(res.body.info)
                      .to.have.all.keys(
                        'estimation_type',
                        'include_all_wanted_ingredients',
                        'minimum_cost',
                        'maximum_cost'
                      );
                  expect(res.body.info.estimation_type).to.equal("full");
                  expect(res.body.info.minimum_cost).to.equal(28);
                  expect(res.body.info.maximum_cost).to.equal(39);
                  expect(res.body.info.include_all_wanted_ingredients).to.equal(true);
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
})


describe("Test Partial Cost Estimation: excluding ingredients", () => {
  describe("Exclude ingredients: Test valid recipe", () => {
    it("should return 200, return minimum/maximum cost and ingredients for recipe 261", (done) => {
      const recipe_id = 261;  
      chai.request("http://localhost:80")
            .get(`/api/recipe/cost/${recipe_id}?exclude_ids=275`)
            .send()
            .end((err, res) => {
                if (err) return done(err);
                expect(res).to.have.status(200);
                expect(res.body)
                    .to.have.all.keys(
                      'info', 
                      'low_cost',
                      'high_cost');
                expect(res.body.info)
                    .to.have.all.keys(
                      'estimation_type',
                      'include_all_wanted_ingredients',
                      'minimum_cost',
                      'maximum_cost'
                    );
                expect(res.body.info.estimation_type).to.equal("partial");
                expect(res.body.info.minimum_cost).to.equal(11);
                expect(res.body.info.maximum_cost).to.equal(12);
                expect(res.body.info.include_all_wanted_ingredients).to.equal(true);
                done();
            });
      });
      it("should return 200, return minimum/maximum cost and ingredients for recipe 262", (done) => {
        const recipe_id = 262;  
        chai.request("http://localhost:80")
              .get(`/api/recipe/cost/${recipe_id}?exclude_ids=3,5`)
              .send()
              .end((err, res) => {
                  if (err) return done(err);
                  expect(res).to.have.status(200);
                  expect(res.body)
                      .to.have.all.keys(
                        'info', 
                        'low_cost',
                        'high_cost');
                  expect(res.body.info)
                      .to.have.all.keys(
                        'estimation_type',
                        'include_all_wanted_ingredients',
                        'minimum_cost',
                        'maximum_cost'
                      );
                  expect(res.body.info.estimation_type).to.equal("partial");
                  expect(res.body.info.minimum_cost).to.equal(17);
                  expect(res.body.info.maximum_cost).to.equal(27);
                  expect(res.body.info.include_all_wanted_ingredients).to.equal(true);
                  done();
              });
      });
  });

  describe("Exclude ingredients: Test invalid recipe and params", () => {
    it("should return 404 for invalid recipe", (done) => {
      const recipe_id = 11111;  
      chai.request("http://localhost:80")
            .get(`/api/recipe/cost/${recipe_id}?exclude_ids=1`)
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
    it("should return 404 for invalid excluding ingredients", (done) => {
      const recipe_id = 262;
      const exclude_id = [275];  
      chai.request("http://localhost:80")
            .get(`/api/recipe/cost/${recipe_id}?exclude_ids=${exclude_id.toString()}`)
            .send()
            .end((err, res) => {
                if (err) return done(err);
                expect(res).to.have.status(404);
                expect(res.body)
                  .to.have.property("error")
                  .that.equals(`Ingredient ${exclude_id.toString()} not found in recipe, can not exclude`);
                done();
            });
    });
  });

  
  describe("Exclude ingredients: Test valid recipe with invalid ingredients", () => {
    it("should return 404 for ingredient not found in store", (done) => {
      const recipe_id = 267; 
      const exclude_id = [2];
      chai.request("http://localhost:80")
            .get(`/api/recipe/cost/${recipe_id}?exclude_ids=${exclude_id.toString()}`)
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
      const exclude_id = [22];
      chai.request("http://localhost:80")
            .get(`/api/recipe/cost/${recipe_id}?exclude_ids=${exclude_id.toString()}`)
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
      const exclude_id = [22];
      chai.request("http://localhost:80")
            .get(`/api/recipe/cost/${recipe_id}?exclude_ids=${exclude_id.toString()}`)
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
})