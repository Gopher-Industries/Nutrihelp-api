const userRepository = require('../repositories/userRepository');
const mediaRepository = require('../repositories/mediaRepository');

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
		return await userRepository.updateByEmail(
			email,
			attributes,
			"user_id,name,first_name,last_name,email,contact_number,mfa_enabled,address"
		);
	} catch (error) {
		throw error;
	}
}
async function saveImage(image, user_id) {
	let file_name = `users/${user_id}.png`;
	if (image === undefined || image === null) return null;

	try {
		await mediaRepository.uploadImageToBucket(file_name, image, false);
		let image_data = await mediaRepository.createImageRecord({
			fileName: file_name,
			displayName: file_name,
			fileSize: base64FileSize(image),
		});

		await userRepository.setUserImageId(user_id, image_data[0].id);

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
