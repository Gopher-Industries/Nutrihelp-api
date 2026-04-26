const supabase = require("../dbConnection.js");
const { decrypt } = require("../utils/encryption");

function decryptSensitiveFields(profile) {
	if (!profile) {
		return profile;
	}

	return {
		...profile,
		contact_number: profile.contact_number ? decrypt(profile.contact_number) : profile.contact_number,
		address: profile.address ? decrypt(profile.address) : profile.address,
	};
}

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

		const profile = decryptSensitiveFields(data);

		if (profile.image_id != null) {
			profile.image_url = await getImageUrl(profile.image_id);
		} else {
			profile.image_url = null;
		}

		return profile;
	} catch (error) {
		throw error;
	}
}

async function getImageUrl(image_id) {
	try {
		if (image_id == null) return "";
		let { data } = await supabase
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
