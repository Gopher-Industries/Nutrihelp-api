require("dotenv").config();
const chai = require("chai");
const chaiHttp = require("chai-http");
const { addTestUser, deleteTestUser, addTestUserMFA } = require("./test-helpers");
const { expect } = chai;
chai.use(chaiHttp);

before(async function () {
    testUser = await addTestUser();
    testUserMFA = await addTestUserMFA();
});

after(async function () {
    await deleteTestUser(testUser.user_id);
    await deleteTestUser(testUserMFA.user_id);
});

describe("Login: Test login - No Email/Password Entered", () => {
    it("should return 400 Email and password are required", (done) => {
        chai.request("http://localhost:80")
            .post("/api/login")
            .send({
                email: "",
                password: "",
            })
            .end((err, res) => {
                if (err) return done(err);
                expect(res).to.have.status(400);
                expect(res.body)
                    .to.have.property("error")
                    .that.equals("Email and password are required");
                done();
            });
    });
});

describe("Login: Test login - Invalid email", () => {
    it("should return 401 Invalid email", (done) => {
        chai.request("http://localhost:80")
            .post("/api/login")
            .send({
                email: "invaliduser@test.com",
                password: "passworddoesntmatter",
            })
            .end((err, res) => {
                if (err) return done(err);
                expect(res).to.have.status(401);
                expect(res.body)
                    .to.have.property("error")
                    .that.equals("Invalid email");
                done();
            });
    });
});

describe("Login: Test login - Invalid Password", () => {
    it("should return 401 Invalid password", (done) => {
        chai.request("http://localhost:80")
            .post("/api/login")
            .send({
                email: testUser.email,
                password: "invalidpassword",
            })
            .end((err, res) => {
                if (err) return done(err);
                expect(res).to.have.status(401);
                expect(res.body)
                    .to.have.property("error")
                    .that.equals("Invalid password");
                done();
            });
    });
});

describe("Login: Test login - Successful Login No MFA", () => {
    it("should return 200", (done) => {
        chai.request("http://localhost:80")
            .post("/api/login")
            .send({
                email: testUser.email,
                password: "testuser123",
            })
            .end((err, res) => {
                if (err) return done(err);
                expect(res).to.have.status(200);
                done();
            });
    });
});

describe("Login: Test login - Login MFA ENABLED Email Sent", () => {
    it("should return 202, mfa code sent", (done) => {
        chai.request("http://localhost:80")
            .post("/api/login")
            .send({
                email: testUserMFA.email,
                password: "testuser123"
            })
            .end((err, res) => {
                if (err) return done(err);
                expect(res).to.have.status(202);
                expect(res.body)
                    .to.have.property("message")
                    .that.equals("An MFA Token has been sent to your email address");
                done();
            });
    });
});