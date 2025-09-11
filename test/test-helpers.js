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
				address: "address",
				account_status: "active",
				email_verified: true,
				is_verified: true
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
				address: "address",
				account_status: "active",
				email_verified: true,
				is_verified: true
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

// New function specifically for shopping list tests
async function getOrCreateTestUserForShoppingList() {
	try {
		// First, try to find an existing test user
		let { data: existingUsers, error: queryError } = await supabase
			.from("users")
			.select("user_id, name, email")
			.like("email", "testuser%@test.com")
			.limit(1);

		if (queryError) {
			throw queryError;
		}

		// If we found an existing test user, use it
		if (existingUsers && existingUsers.length > 0) {
			console.log(`✅ Using existing test user: ${existingUsers[0].email} (ID: ${existingUsers[0].user_id})`);
			return existingUsers[0].user_id;
		}

		// If no existing test user, create a new one
		console.log("👤 Creating new test user for shopping list tests...");
		const testUser = await addTestUser();
		console.log(`✅ Created new test user: ${testUser.email} (ID: ${testUser.user_id})`);
		return testUser.user_id;
	} catch (error) {
		console.error("❌ Failed to get or create test user:", error);
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


module.exports = { addTestUser, deleteTestUser, addTestUserMFA, addTestRecipe, getOrCreateTestUserForShoppingList };
