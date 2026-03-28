require("dotenv").config();
const chai = require("chai");
const chaiHttp = require("chai-http");
const { addTestUser, deleteTestUser, getToken } = require("./test-helpers");
const { expect } = chai;
chai.use(chaiHttp);

describe("User Profile Tests", () => {
	let testUser;

	before(async function () {
		testUser = await addTestUser();
	});
	after(async function () {
		await deleteTestUser(testUser.user_id);
	});
	it("should return 200, Update user profile Successful", (done) => {
		let req = {
			email: testUser.email,
			first_name: "updated_name",
			last_name: "updated_last_name",
			contact_number: "111111111"
		};
		chai.request("http://localhost:80")
			.put("/api/userprofile")
			.send(req)
			.end((err, res) => {
				if (err) return done(err);
				expect(res).to.have.status(200);
				expect(res.body[0]).to.have.property(
					"first_name",
					req.first_name
				);
				expect(res.body[0]).to.have.property(
					"last_name",
					req.last_name
				);
				expect(res.body[0]).to.have.property("email", req.email);
				expect(res.body[0]).to.have.property(
					"contact_number",
					req.contact_number
				);
				done();
			});
	});
	it("should return 400, Missing username", (done) => {
		let req = {};
		chai.request("http://localhost:80")
			.put("/api/userprofile")
			.send(req)
			.end((err, res) => {
				expect(res).to.have.status(400);
				done();
			});
	});
});
