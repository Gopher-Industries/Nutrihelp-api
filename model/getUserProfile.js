const userRepository = require('../repositories/userRepository');
const mediaRepository = require('../repositories/mediaRepository');

async function getUserProfile(email) {
	try {
		let data = await userRepository.findProfileByEmail(email);

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
		let data = await mediaRepository.getImageById(image_id);
		if (data[0] != null) {
			let x = `${process.env.SUPABASE_STORAGE_URL}${data[0].file_name}`;
			return x;
		}
		return data;
	} catch (error) {
		console.error('[getUserProfile] Failed to resolve image URL:', error);
		throw error;
	}
}

module.exports = getUserProfile;
