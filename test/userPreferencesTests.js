require("dotenv").config();
const chai = require("chai");
const chaiHttp = require("chai-http");
const { addTestUser, deleteTestUser, getToken } = require("./test-helpers");
const { expect } = chai;
chai.use(chaiHttp);

describe("userPreferences Tests", () => {
	let testUser;
	let token;
	let req;

	before(async function () {
		testUser = await addTestUser();
		req = {
			dietary_requirements: [1, 2, 4],
			allergies: [1],
			cuisines: [2, 5],
			dislikes: [4],
			health_conditions: [],
			spice_levels: [1, 2],
			cooking_methods: [1, 4, 5],
			user: {
				userId: testUser.user_id,
			},
		};
	});

	beforeEach(async function () {
		let loginRequest = {
			email: testUser.email,
			password: "testuser123",
		};
		const res = await chai
			.request("http://localhost:80")
			.post("/api/login")
			.send(loginRequest);

		token = res.body.token;
	});

	after(async function () {
		await deleteTestUser(testUser.user_id);
	});

	it("should return 400, Missing UserId", (done) => {
		chai.request("http://localhost:80")
			.post("/api/user/preferences")
			.send({})
			.set("Authorization", `Bearer ${token}`)
			.end((err, res) => {
				expect(res).to.have.status(400);
				expect(res.body)
					.to.have.property("error")
					.that.equals("User ID is required");
				done();
			});
	});

	it("should return 204, Add User Feedback Successful", (done) => {
		chai.request("http://localhost:80")
			.post("/api/user/preferences")
			.send(req)
			.set("Authorization", `Bearer ${token}`)
			.end((err, res) => {
				if (err) return done(err);
				expect(res).to.have.status(204);
				done();
			});
	});
});
