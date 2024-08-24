require("dotenv").config();
const chai = require("chai");
const chaiHttp = require("chai-http");
const { expect } = chai;
chai.use(chaiHttp);

describe("UserFeedback Tests", () => {
	it("should return 400, Name is Required", (done) => {
		chai.request("http://localhost:80")
			.post("/api/userfeedback")
			.send()
			.end((err, res) => {
				if (err) return done(err);
				expect(res).to.have.status(400);
				expect(res.body)
					.to.have.property("error")
					.that.equals("Name is required");
				done();
			});
	});
	it("should return 400, Email is Required", (done) => {
		chai.request("http://localhost:80")
			.post("/api/userfeedback")
			.send({
				name: "test",
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
	it("should return 400, Experience is Required", (done) => {
		chai.request("http://localhost:80")
			.post("/api/userfeedback")
			.send({
				name: "test",
				email: "test@test.com",
			})
			.end((err, res) => {
				if (err) return done(err);
				expect(res).to.have.status(400);
				expect(res.body)
					.to.have.property("error")
					.that.equals("Experience is required");
				done();
			});
	});
	it("should return 400, Message is Required", (done) => {
		chai.request("http://localhost:80")
			.post("/api/userfeedback")
			.send({
				name: "test",
				email: "test@test.com",
				experience: "This is the best app ever",
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

	it("should return 201, Add User Feedback Successful", (done) => {
		chai.request("http://localhost:80")
			.post("/api/userfeedback")
			.send({
				name: "test",
				email: "test@test.com",
				experience: "This is the best app ever",
				message: "These are some good developers",
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
