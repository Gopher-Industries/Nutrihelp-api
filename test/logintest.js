require("dotenv").config();
const chai = require("chai");
const chaiHttp = require("chai-http");
const { expect } = chai;
chai.use(chaiHttp);

describe("Login: Test login - No Username/Password Entered", () => {
    it("should return 400 Username and password are required", (done) => {
        chai.request("http://localhost:80")
            .post("/api/login")
            .send({
                username: "",
                password: "",
            })
            .end((err, res) => {
                if (err) return done(err);
                expect(res).to.have.status(400);
                expect(res.body)
                    .to.have.property("error")
                    .that.equals("Username and password are required");
                done();
            });
    });
});

describe("Login: Test login - Invalid Username", () => {
    it("should return 401 Invalid username", (done) => {
        chai.request("http://localhost:80")
            .post("/api/login")
            .send({
                username: "invaliduser",
                password: "passworddoesntmatter",
            })
            .end((err, res) => {
                if (err) return done(err);
                expect(res).to.have.status(401);
                expect(res.body)
                    .to.have.property("error")
                    .that.equals("Invalid username");
                done();
            });
    });
});

describe("Login: Test login - Invalid Password", () => {
    it("should return 401 Invalid password", (done) => {
        chai.request("http://localhost:80")
            .post("/api/login")
            .send({
                username: "test",
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
                username: "test@test.com",
                password: "test",
            })
            .end((err, res) => {
                if (err) return done(err);
                expect(res).to.have.status(200);
                done();
            });
    });
});

//still need to write test for mfa enabled
//also need to figure out how to stub a user, dont want to use actual credentials for now it doesnt matter