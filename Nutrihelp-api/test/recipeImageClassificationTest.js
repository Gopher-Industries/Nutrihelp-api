require("dotenv").config();
const chai = require("chai");
const chaiHttp = require("chai-http");
const { expect } = chai;
chai.use(chaiHttp);
const fs = require("fs");

describe('Recipe Image Classification Test: No Image Uploaded', () => {
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

describe('Recipe Image Classification: Non-Image File Uploaded', () => {
    it('should return 400 if wrong filetype is uploaded', (done) => {
        chai.request("http://localhost:80")
            .post('/api/recipeImageClassification')
            .attach('image', './uploads/test.txt')
            .end((err, res) => {
                expect(res).to.have.status(400);
                done();
            });
    });
});

describe('Recipe Image Classification: Success', () => {
    it('should return 200 for success', (done) => {
        chai.request("http://localhost:80")
            .post('/api/recipeImageClassification')
            .attach('image', './uploads/testimage.jpg')
            .end((err, res) => {
                expect(res).to.have.status(200);
                done();
            });
 //set this timeout to 100 seconds as the python script takes a long time to run
    }).timeout(100000); 
});