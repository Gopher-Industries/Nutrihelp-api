require("dotenv").config();
const chai = require("chai");
const chaiHttp = require("chai-http");
const { expect } = chai;
chai.use(chaiHttp);

describe("Test Recipe Scaling", () => {
  describe("Recipe Scaling: Test valid recipe", () => {
    it("should return 200, return the scaled quantity by ratio for recipe 261", (done) => {
      const recipe_id = 261;  
      const serving = 3;
      chai.request("http://localhost:80")
          .get(`/api/recipe/scale/${recipe_id}/${serving}`)
          .send()
          .end((err, res) => {
              if (err) return done(err);
              expect(res).to.have.status(200);
              expect(res.body)
                  .to.have.all.keys(
                    'id',
                    'scale_ratio', 
                    'desired_servings',
                    'scaled_ingredients',
                    'original_serving',
                    'original_ingredients');
              expect(res.body.scaled_ingredients)
                  .to.have.all.keys(
                    'id',
                    'quantity',
                    'measurement'
                  );
              let org_ingre = res.body.original_ingredients;
              let scaled_ingre = res.body.scaled_ingredients;
              let scale_ratio = res.body.scale_ratio;
              expect(scaled_ingre.id.length).to.equal(scaled_ingre.quantity.length);
              expect(scaled_ingre.id.length).to.equal(scaled_ingre.measurement.length);
              
              expect(scale_ratio).to.equal(res.body.desired_servings / res.body.original_serving);
              scaled_ingre.quantity.forEach((scaled_qty, index) => {
                expect(scaled_qty).to.equal(scale_ratio * org_ingre.quantity[index]);
              });
              done();
          });
      });
  });
  
  describe("Recipe Scaling: Test invalid recipe", () => {
    it("should return 404 for invalid recipe", (done) => {
      const recipe_id = 11111;  
      const serving = 3;
      chai.request("http://localhost:80")
            .get(`/api/recipe/scale/${recipe_id}/${serving}`)
            .send()
            .end((err, res) => {
                if (err) return done(err);
                expect(res).to.have.status(404);
                expect(res.body)
                  .to.have.property("error")
                  .that.equals("Invalid recipe id, can not scale");
                done();
            });
    });
  });

  describe("Recipe Scaling: Test valid recipe with invalid data", () => {
    it("should return 404 for invalid total servings", (done) => {
      const recipe_id = 267;  
      const serving = 3;
      chai.request("http://localhost:80")
            .get(`/api/recipe/scale/${recipe_id}/${serving}`)
            .send()
            .end((err, res) => {
                if (err) return done(err);
                expect(res).to.have.status(404);
                expect(res.body)
                  .to.have.property("error")
                  .that.equals("Recipe contains invalid total serving, can not scale");
                done();
            });
    });

    it("should return 404 for invalid ingredients (null or invalid id)", (done) => {
      const recipe_id = 19;  
      const serving = 3;
      chai.request("http://localhost:80")
            .get(`/api/recipe/scale/${recipe_id}/${serving}`)
            .send()
            .end((err, res) => {
                if (err) return done(err);
                expect(res).to.have.status(404);
                expect(res.body)
                  .to.have.property("error")
                  .that.equals("Recipe contains invalid ingredients data, can not scale");
                done();
            });
    });
  });
})