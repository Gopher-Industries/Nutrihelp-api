require("dotenv").config();
const chai = require("chai");
const chaiHttp = require("chai-http");
const deleteUser = require("../model/deleteUser");
const getUser = require("../model/getUser");
const { addTestUser, deleteTestUser } = require("./test-helpers");
const { expect } = chai;
chai.use(chaiHttp);

before(async function () {
    testUser = await addTestUser();
});

after(async function () {
    await deleteTestUser(testUser.user_id);
});

describe("Signup: Test signup - No Credentials Entered", () => {
    it("should return 400, Name, password, email and contact number are required", (done) => {
        chai.request("http://localhost:80")
            .post("/api/signup")
            .send()
            .end((err, res) => {
                if (err) return done(err);
                expect(res).to.have.status(400);
                expect(res.body)
                    .to.have.property("error")
                    .that.equals("Name, email, password, contact number and address are required");
                done();
            });
    });
});

describe("Signup: Test signup - User Already Exists", () => {
    it("should return 400, User already exists", (done) => {
        chai.request("http://localhost:80")
            .post("/api/signup")
            .send({
                name: testUser.name,
                email: testUser.email,
                password: testUser.password,
                contact_number: testUser.contact_number,
                address: testUser.address
            })
            .end((err, res) => {
                if (err) return done(err);
                expect(res).to.have.status(400);
                expect(res.body)
                    .to.have.property("error")
                    .that.equals("User already exists");
                done();
            });
    });
});

describe("Signup: Test signup - Successful Sign Up", () => {
    it("should return 201, User created successfully", (done) => {
        chai.request("http://localhost:80")
            .post("/api/signup")
            .send({
                name: `test user success`,
                email: `testuser${Math.random().toString()}@test.com`,
                password: "signuptestpassword",
                contact_number: "0412345678",
                address: "address"
            })
            .end((err, res) => {
                if (err) return done(err);
                expect(res).to.have.status(201);
                expect(res.body)
                    .to.have.property("message")
                    .that.equals("User created successfully");
                done();
                deleteCreatedUserFromDB("signuptestuser"); //deletes user created for test purpose
            });
    });
});

//function to delete user after adding it to db with test
async function deleteCreatedUserFromDB(username) {
    let user = await getUser(username);
    if (user) {
        deleteUser(user[0].user_id); //because get user returns an array, need to set index, because we are only allowing unique users this should be fine
    }
}
