const supabase = require("../dbConnection.js");
const { decrypt } = require("../services/encryptionService");

const LEGACY_HEX_TRIPLET_REGEX = /^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i;

function parseEncryptedPayload(rawValue) {
	if (typeof rawValue !== "string") return null;
	const trimmed = rawValue.trim();
	if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return null;

	try {
		const parsed = JSON.parse(trimmed);
		if (
			parsed &&
			typeof parsed === "object" &&
			typeof parsed.encrypted === "string" &&
			typeof parsed.iv === "string" &&
			typeof parsed.authTag === "string"
		) {
			return parsed;
		}
		return null;
	} catch (_error) {
		return null;
	}
}

function looksLikeUndecryptedCiphertext(value) {
	if (typeof value !== "string") return false;
	const trimmed = value.trim();
	if (!trimmed) return false;
	if (LEGACY_HEX_TRIPLET_REGEX.test(trimmed)) return true;
	return parseEncryptedPayload(trimmed) !== null;
}

async function maybeDecryptLegacyField(value) {
	if (!value) return value;
	const encryptedObj = parseEncryptedPayload(value);
	if (!encryptedObj) return value;

	try {
		return await decrypt(encryptedObj.encrypted, encryptedObj.iv, encryptedObj.authTag);
	} catch (_error) {
		// If decryption fails, do not leak encrypted payload text to clients.
		return null;
	}
}

async function decryptSensitiveFields(profile) {
	if (!profile) {
		return profile;
	}

	const decryptedContact = await maybeDecryptLegacyField(profile.contact_number);
	const decryptedAddress = await maybeDecryptLegacyField(profile.address);

	const normalizedContact =
		decryptedContact == null
			? null
			: looksLikeUndecryptedCiphertext(decryptedContact)
				? null
				: decryptedContact;
	const normalizedAddress =
		decryptedAddress == null
			? null
			: looksLikeUndecryptedCiphertext(decryptedAddress)
				? null
				: decryptedAddress;

	return {
		...profile,
		contact_number: normalizedContact,
		address: normalizedAddress,
	};
}

async function getUserProfile(lookup = {}) {
	try {
		const query = supabase
			.from("users")
			.select(
				"user_id,name,first_name,last_name,email,contact_number,mfa_enabled,address,image_id,registration_date,last_login,account_status,profile_encrypted,profile_encryption_iv,profile_encryption_auth_tag,profile_encryption_key_version,user_roles!left(role_name)"
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

		const profile = await decryptSensitiveFields(data);

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
			return await resolveImageUrl(data[0].file_name);
		}
		return data;
	} catch (error) {
		console.log(error);
		throw error;
	}
}

async function resolveImageUrl(file_name) {
	if (!file_name) return null;

	// Signed URL works for both public and private buckets.
	const { data: signedData, error: signedError } = await supabase
		.storage
		.from("images")
		.createSignedUrl(file_name, 60 * 60 * 24);

	if (!signedError && signedData?.signedUrl) {
		return signedData.signedUrl;
	}

	// Fallback to public URL if signing fails for any reason.
	const { data: publicData } = supabase
		.storage
		.from("images")
		.getPublicUrl(file_name);

	return publicData?.publicUrl || null;
}

module.exports = getUserProfile;
