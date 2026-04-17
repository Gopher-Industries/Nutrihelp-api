require("dotenv").config();
const chai = require("chai");
const chaiHttp = require("chai-http");
const { expect } = chai;
const deleteAppointment = require("../model/deleteAppointment");
chai.use(chaiHttp);

describe("Appointment: Test saveAppointment - Required Fields Not Entered", () => {
    it("should return 400, Missing required fields", (done) => {
        chai.request("http://localhost:80")
            .post("/api/appointments")
            .send()
            .end((err, res) => {
                if (err) return done(err);
                expect(res).to.have.status(400);
                expect(res.body)
                    .to.have.property("error")
                    .that.equals("Missing required fields");
                done();
            });
    });
});

describe("Appointment: Test saveAppointment - Appointment Saved Successfully", () => {
    it("should return 201, Appointment saved successfully", (done) => {
        chai.request("http://localhost:80")
            .post("/api/appointments")
            .send({
                userId: "1",
                date: "2024-01-01",
                time: "20:30:00",
                description: "test appointment"
            })
            .end((err, res) => {
                if (err) return done(err);
                expect(res).to.have.status(201);
                expect(res.body)
                    .to.have.property("message")
                    .that.equals("Appointment saved successfully");
                done();
                deleteAppointment("1", "2024-01-01", "20:30:00", "test appointment"); //deletes created appointment from db
            });
    });
});

describe("Appointment: Test getAppointments - Success", () => {
    it("should return 200, with an array of appointments", (done) => {
        chai.request("http://localhost:80")
            .get("/api/appointments")
            .end((err, res) => {
                if (err) return done(err);
                expect(res).to.have.status(200);
                expect(res.body).to.be.an("array");
                done();
            });
    });
});