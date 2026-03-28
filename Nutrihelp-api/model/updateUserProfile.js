const supabase = require("../dbConnection.js");
const { decode } = require("base64-arraybuffer");

async function updateUser(
	name,
	first_name,
	last_name,
	email,
	contact_number,
	address
) {
	let attributes = {};
	attributes["name"] = name || undefined;
	attributes["first_name"] = first_name || undefined;
	attributes["last_name"] = last_name || undefined;
	attributes["email"] = email || undefined;
	attributes["contact_number"] = contact_number || undefined;
	attributes["address"] = address || undefined;

	try {
		let { data, error } = await supabase
			.from("users")
			.update(attributes) // e.g { email: "sample@email.com" }
			.eq("email", email)
			.select(
				"user_id,name,first_name,last_name,email,contact_number,mfa_enabled,address"
			);
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
