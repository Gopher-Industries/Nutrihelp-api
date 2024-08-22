const addUser = require("../model/addUser");
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
				username: testUser,
				password: hashedPassword,
				mfa_enabled: false,
				contact_number: "000000000",
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

module.exports = { addTestUser, deleteTestUser };
