const deleteUser = require("../model/deleteUser");
const supabase = require("../dbConnection.js");
const bcrypt = require("bcryptjs");

async function addTestUser() {
	let testUser = `testuser${Math.random().toString()}@test.com`;
	const hashedPassword = await bcrypt.hash("testuser123", 10);
	try {
		let { data, error } = await supabase
			.from("users")
			.insert({
				name: "test user",
				email: testUser,
				password: hashedPassword,
				mfa_enabled: false,
				contact_number: "000000000",
				address: "address"
			})
			.select();

		if (error) {
			throw error;
		}
		const createdUser = data[0];
		return createdUser;
	} catch (error) {
		throw error;
	}
}

async function addTestUserMFA() {
	let testUser = `testuser${Math.random().toString()}@test.com`;
	const hashedPassword = await bcrypt.hash("testuser123", 10);
	try {
		let { data, error } = await supabase
			.from("users")
			.insert({
				name: "test user",
				email: testUser,
				password: hashedPassword,
				mfa_enabled: true,
				contact_number: "000000000",
				address: "address"
			})
			.select();

		if (error) {
			throw error;
		}
		const createdUser = data[0];
		return createdUser;
	} catch (error) {
		throw error;
	}
}

async function deleteTestUser(userId) {
	deleteUser(userId);
}

async function addTestRecipe() {
    try {
		let { data, error } = await supabase
			.from("recipes")
			.insert({
                recipe_name: "test recipe to delete",
				user_id: "1"
			})
			.select();

		if (error) {
			throw error;
		}
		const savedRecipe = data[0];
		return savedRecipe;
	} catch (error) {
		throw error;
	}
};

async function getTestServer() {
	const app = express();
	app.use(express.json());
	
	const routes = require("../routes");
	routes(app);
	
	return app;
}


module.exports = { addTestUser, deleteTestUser, addTestUserMFA, addTestRecipe };
