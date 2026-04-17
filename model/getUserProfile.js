const supabase = require("../dbConnection.js");

async function getUserProfile(lookup = {}) {
	try {
		const query = supabase
			.from("users")
			.select(
				"user_id,name,first_name,last_name,email,contact_number,mfa_enabled,address,image_id,registration_date,last_login,account_status,user_roles!left(role_name)"
			);

		if (lookup.userId != null) {
			query.eq("user_id", lookup.userId);
		} else if (lookup.email) {
			query.eq("email", lookup.email);
		} else {
			throw new Error("A userId or email lookup is required");
		}

		const { data, error } = await query.maybeSingle();
		if (error) {
			throw error;
		}

		if (!data) {
			return null;
		}

		if (data.image_id != null) {
			data.image_url = await getImageUrl(data.image_id);
		} else {
			data.image_url = null;
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
