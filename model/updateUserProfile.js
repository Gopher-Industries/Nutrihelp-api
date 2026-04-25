const supabase = require("../dbConnection.js");
const { decode } = require("base64-arraybuffer");
const { encrypt, decrypt } = require("../services/encryptionService");

async function decryptSensitiveFields(profile) {
	if (!profile) {
		return profile;
	}

	const decryptedContact = profile.contact_number ? await (async () => {
		const encryptedObj = JSON.parse(profile.contact_number);
		return await decrypt(encryptedObj.encrypted, encryptedObj.iv, encryptedObj.authTag);
	})() : profile.contact_number;

	const decryptedAddress = profile.address ? await (async () => {
		const encryptedObj = JSON.parse(profile.address);
		return await decrypt(encryptedObj.encrypted, encryptedObj.iv, encryptedObj.authTag);
	})() : profile.address;

	return {
		...profile,
		contact_number: decryptedContact,
		address: decryptedAddress,
	};
}

async function buildPayload(attributes = {}) {
	const payload = Object.fromEntries(
		Object.entries(attributes).filter(([, value]) => value !== undefined)
	);

	if (payload.contact_number) {
		payload.contact_number = JSON.stringify(await encrypt(payload.contact_number));
	}

	if (payload.address) {
		payload.address = JSON.stringify(await encrypt(payload.address));
	}

	return payload;
}

async function updateUser({ userId, attributes = {} }) {
	const payload = await buildPayload(attributes);

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
			return await decryptSensitiveFields(data);
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
		return await decryptSensitiveFields(data);
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
			.update({ image_id: image_data[0].id })
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
