require("dotenv").config();
const chai = require("chai");
const chaiHttp = require("chai-http");
const { expect } = chai;
chai.use(chaiHttp);

describe('POST /recipeImageClassification', () => {
    it('should return 400 if no file is uploaded', (done) => {
        chai.request("http://localhost:80")
            .post('/api/recipeImageClassification')
            .send()
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('error', 'No image uploaded');
                done();
            });
    });
});