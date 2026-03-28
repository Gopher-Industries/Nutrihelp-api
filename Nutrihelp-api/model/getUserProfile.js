const supabase = require("../dbConnection.js");

async function getUserProfile(email) {
	try {
		let { data, error } = await supabase
			.from("users")
			.select(
				"user_id,name,first_name,last_name,email,contact_number,mfa_enabled,address,image_id"
			)
			.eq("email", email);

		if (data[0].image_id != null) {
			data[0].image_url = await getImageUrl(data[0].image_id);
		}

		return data;
	} catch (error) {
		throw error;
	}
}

async function getImageUrl(image_id) {
	try {
		if (image_id == null) return "";
		let { data, error } = await supabase
			.from("images")
			.select("*")
			.eq("id", image_id);
		if (data[0] != null) {
			let x = `${process.env.SUPABASE_STORAGE_URL}${data[0].file_name}`;
			return x;
		}
		return data;
	} catch (error) {
		console.log(error);
		throw error;
	}
}

module.exports = getUserProfile;
