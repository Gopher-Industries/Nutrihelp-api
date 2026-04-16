const supabase = require("../dbConnection.js");
const { decode } = require("base64-arraybuffer");

async function updateUser({ userId, attributes = {} }) {
	const payload = Object.fromEntries(
		Object.entries(attributes).filter(([, value]) => value !== undefined)
	);

	try {
		if (!userId) {
			throw new Error("userId is required");
		}

		if (Object.keys(payload).length === 0) {
			const { data, error } = await supabase
				.from("users")
				.select(
					"user_id,name,first_name,last_name,email,contact_number,mfa_enabled,address,image_id,registration_date,last_login,account_status,user_roles!left(role_name)"
				)
				.eq("user_id", userId)
				.maybeSingle();

			if (error) throw error;
			return data;
		}

		const { data, error } = await supabase
			.from("users")
			.update(payload)
			.eq("user_id", userId)
			.select(
				"user_id,name,first_name,last_name,email,contact_number,mfa_enabled,address,image_id,registration_date,last_login,account_status,user_roles!left(role_name)"
			)
			.maybeSingle();

		if (error) throw error;
		return data;
	} catch (error) {
		throw error;
	}
}

async function saveImage(image, user_id) {
	let file_name = `users/${user_id}.png`;
	if (image === undefined || image === null) return null;

	try {
		await supabase.storage.from("images").upload(file_name, decode(image), {
			cacheControl: "3600",
			upsert: false,
		});
		const test = {
			file_name: file_name,
			display_name: file_name,
			file_size: base64FileSize(image),
		};
		let { data: image_data } = await supabase
			.from("images")
			.insert(test)
			.select("*");

		await supabase
			.from("users")
			.update({ image_id: image_data[0].id }) // e.g { email: "sample@email.com" }
			.eq("user_id", user_id);

		return `${process.env.SUPABASE_STORAGE_URL}${file_name}`;
	} catch (error) {
		throw error;
	}
}

function base64FileSize(base64String) {
	let base64Data = base64String.split(",")[1] || base64String;

	let sizeInBytes = (base64Data.length * 3) / 4;

	if (base64Data.endsWith("==")) {
		sizeInBytes -= 2;
	} else if (base64Data.endsWith("=")) {
		sizeInBytes -= 1;
	}

	return sizeInBytes;
}

module.exports = { updateUser, saveImage };
