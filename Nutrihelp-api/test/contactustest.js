require("dotenv").config();
const chai = require("chai");
const chaiHttp = require("chai-http");
const { expect } = chai;
chai.use(chaiHttp);

describe("Contactus: Test contactus - Name Not Entered", () => {
    it("should return 400, Name is required", (done) => {
        chai.request("http://localhost:80")
            .post("/api/contactus")
            .send({
                name: "",
                email: "test@test.com",
                subject: "test",
                message: "test"
            })
            .end((err, res) => {
                if (err) return done(err);
                expect(res).to.have.status(400);
                expect(res.body)
                    .to.have.property("error")
                    .that.equals("Name is required");
                done();
            });
    });
});

describe("Contactus: Test contactus - Email Not Entered", () => {
    it("should return 400, Email is required", (done) => {
        chai.request("http://localhost:80")
            .post("/api/contactus")
            .send({
                name: "test",
                email: "",
                subject: "test",
                message: "test"
            })
            .end((err, res) => {
                if (err) return done(err);
                expect(res).to.have.status(400);
                expect(res.body)
                    .to.have.property("error")
                    .that.equals("Email is required");
                done();
            });
    });
});

describe("Contactus: Test contactus - Subject Not Entered", () => {
    it("should return 400, Subject is required", (done) => {
        chai.request("http://localhost:80")
            .post("/api/contactus")
            .send({
                name: "test",
                email: "test@test.com",
                subject: "",
                message: "test"
            })
            .end((err, res) => {
                if (err) return done(err);
                expect(res).to.have.status(400);
                expect(res.body)
                    .to.have.property("error")
                    .that.equals("Subject is required");
                done();
            });
    });
});

describe("Contactus: Test contactus - Name Not Entered", () => {
    it("should return 400, Message is required", (done) => {
        chai.request("http://localhost:80")
            .post("/api/contactus")
            .send({
                name: "test",
                email: "test@test.com",
                subject: "test",
                message: ""
            })
            .end((err, res) => {
                if (err) return done(err);
                expect(res).to.have.status(400);
                expect(res.body)
                    .to.have.property("error")
                    .that.equals("Message is required");
                done();
            });
    });
});

describe("Contactus: Test contactus - Message Sent Successfully", () => {
    it("should return 201, Data recieved successfully", (done) => {
        chai.request("http://localhost:80")
            .post("/api/contactus")
            .send({
                name: "test",
                email: "test@test.com",
                subject: "test",
                message: "test"
            })
            .end((err, res) => {
                if (err) return done(err);
                expect(res).to.have.status(201);
                expect(res.body)
                    .to.have.property("message")
                    .that.equals("Data received successfully!");
                done();
            });
    });
});