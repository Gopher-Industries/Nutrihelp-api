const supabase = require("../dbConnection.js");
const { decode } = require("base64-arraybuffer");
const { encrypt, decrypt } = require("../utils/encryption");

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

function buildPayload(attributes = {}) {
	const payload = Object.fromEntries(
		Object.entries(attributes).filter(([, value]) => value !== undefined)
	);

	if (payload.contact_number) {
		payload.contact_number = encrypt(payload.contact_number);
	}

	if (payload.address) {
		payload.address = encrypt(payload.address);
	}

	return payload;
}

function parseBase64Image(image) {
	const raw = typeof image === "string" ? image.trim() : "";
	if (!raw) {
		throw new Error("Invalid image payload");
	}

	const dataUrlMatch = raw.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/);
	const mimeType = dataUrlMatch ? dataUrlMatch[1].toLowerCase() : "png";
	const base64 = dataUrlMatch ? dataUrlMatch[2] : (raw.split(",")[1] || raw);

	if (!base64) {
		throw new Error("Invalid base64 image content");
	}

	const extMap = {
		jpeg: "jpg",
		jpg: "jpg",
		png: "png",
		webp: "webp",
		gif: "gif",
		"svg+xml": "svg",
	};

	return {
		base64,
		extension: extMap[mimeType] || "png",
	};
}

async function upsertImageMetadata(file_name, file_size) {
	const metadata = {
		file_name,
		display_name: file_name,
		file_size,
	};

	const { data: existingRow, error: existingError } = await supabase
		.from("images")
		.select("id")
		.eq("file_name", file_name)
		.order("id", { ascending: false })
		.limit(1)
		.maybeSingle();

	if (existingError) {
		throw existingError;
	}

	if (existingRow?.id) {
		const { data: updatedRow, error: updateError } = await supabase
			.from("images")
			.update(metadata)
			.eq("id", existingRow.id)
			.select("id")
			.maybeSingle();

		if (updateError) {
			throw updateError;
		}

		return updatedRow?.id || existingRow.id;
	}

	const { data: insertedRows, error: insertError } = await supabase
		.from("images")
		.insert(metadata)
		.select("id");

	if (insertError) {
		throw insertError;
	}

	if (!Array.isArray(insertedRows) || !insertedRows[0]?.id) {
		throw new Error("Failed to create image metadata");
	}

	return insertedRows[0].id;
}

async function resolveImageUrl(file_name) {
	if (!file_name) return null;

	const { data: signedData, error: signedError } = await supabase
		.storage
		.from("images")
		.createSignedUrl(file_name, 60 * 60 * 24);

	if (!signedError && signedData?.signedUrl) {
		return signedData.signedUrl;
	}

	const { data: publicData } = supabase
		.storage
		.from("images")
		.getPublicUrl(file_name);

	return publicData?.publicUrl || null;
}

async function updateUser({ userId, attributes = {} }) {
	const payload = buildPayload(attributes);

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
			return decryptSensitiveFields(data);
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
		return decryptSensitiveFields(data);
	} catch (error) {
		throw error;
	}
}

async function saveImage(image, user_id) {
	if (image === undefined || image === null) return null;

	try {
		const { base64, extension } = parseBase64Image(image);
		const file_name = `users/${user_id}.${extension}`;

		const { error: uploadError } = await supabase.storage.from("images").upload(file_name, decode(base64), {
			cacheControl: "3600",
			upsert: true,
		});

		if (uploadError) {
			throw uploadError;
		}

		const imageId = await upsertImageMetadata(file_name, base64FileSize(base64));

		const { error: userUpdateError } = await supabase
			.from("users")
			.update({ image_id: imageId })
			.eq("user_id", user_id);

		if (userUpdateError) {
			throw userUpdateError;
		}

		return await resolveImageUrl(file_name);
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
