const getUserProfile = require('../model/getUserProfile');
const { updateUser, saveImage } = require('../model/updateUserProfile');
const fetchUserPreferences = require('../model/fetchUserPreferences');
const { ServiceError } = require('./serviceError');
const { decryptFromDatabase, encryptForDatabase } = require('./encryptionService');

const PROFILE_CONTRACT_VERSION = 'user-profile-v1';

function normalizeString(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized === '' ? null : normalized;
}

function normalizeEmail(value) {
  const normalized = normalizeString(value);
  return normalized ? normalized.toLowerCase() : normalized;
}

function normalizeNameList(items) {
  const source = Array.isArray(items) ? items : [];
  return [...new Set(source
    .map((item) => {
      if (!item) return null;
      if (typeof item === 'string') return item.trim().toLowerCase();
      if (typeof item === 'object' && item.name != null) return String(item.name).trim().toLowerCase();
      return null;
    })
    .filter(Boolean))];
}

function toFullName(parts) {
  return parts.filter(Boolean).join(' ').trim() || null;
}

function buildCanonicalProfile(profile) {
  if (!profile) {
    return null;
  }

  const firstName = profile.first_name ?? null;
  const lastName = profile.last_name ?? null;
  const fullName = toFullName([firstName, lastName]) || profile.name || null;

  // Note: Decryption of sensitive fields (contact_number, address) happens at the service layer
  // when fetching encrypted data. This function builds the response with decrypted values.
  return {
    id: profile.user_id,
    email: profile.email ?? null,
    username: profile.name ?? null,
    firstName,
    lastName,
    fullName,
    contactNumber: profile.contact_number ?? null,
    address: profile.address ?? null,
    imageUrl: profile.image_url ?? null,
    role: profile.user_roles?.role_name || profile.role || null,
    mfaEnabled: Boolean(profile.mfa_enabled),
    accountStatus: profile.account_status ?? null,
    registrationDate: profile.registration_date ?? null,
    lastLogin: profile.last_login ?? null
  };
}

function buildPreferenceSummary(preferences) {
  const source = preferences && typeof preferences === 'object' ? preferences : {};

  const summary = {
    dietaryRequirements: normalizeNameList(source.dietary_requirements),
    allergies: normalizeNameList(source.allergies),
    cuisines: normalizeNameList(source.cuisines),
    dislikes: normalizeNameList(source.dislikes),
    healthConditions: normalizeNameList(source.health_conditions),
    spiceLevels: normalizeNameList(source.spice_levels),
    cookingMethods: normalizeNameList(source.cooking_methods)
  };

  return {
    ...summary,
    hasPreferences: Object.values(summary).some((items) => items.length > 0)
  };
}

function buildProfileResponse(profile, preferences) {
  const canonicalProfile = buildCanonicalProfile(profile);
  const preferenceSummary = buildPreferenceSummary(preferences);

  return {
    success: true,
    contractVersion: PROFILE_CONTRACT_VERSION,
    profile: canonicalProfile,
    preferenceSummary
  };
}

function extractProfileInput(body = {}) {
  const source = body.profile && typeof body.profile === 'object' ? body.profile : body;

  return {
    username: normalizeString(source.username ?? source.name),
    firstName: normalizeString(source.firstName ?? source.first_name),
    lastName: normalizeString(source.lastName ?? source.last_name),
    email: normalizeEmail(source.email),
    contactNumber: normalizeString(source.contactNumber ?? source.contact_number),
    address: normalizeString(source.address),
    userImage: source.userImage ?? source.user_image
  };
}

function hasProfileUpdates(input) {
  return Object.values(input).some((value) => value !== undefined);
}

async function findProfileOrThrow(lookup) {
  const profile = await getUserProfile(lookup);
  if (!profile) {
    throw new ServiceError(404, 'User not found');
  }

  return profile;
}

async function getCanonicalProfile(lookup) {
  const profile = await findProfileOrThrow(lookup);
  
  // Week 6: Decrypt sensitive fields if they are encrypted
  if (profile.profile_encrypted && profile.profile_encryption_iv && profile.profile_encryption_auth_tag) {
    try {
      const decrypted = await decryptFromDatabase(profile, {
        encrypted: 'profile_encrypted',
        iv: 'profile_encryption_iv',
        authTag: 'profile_encryption_auth_tag'
      });
      
      if (decrypted && typeof decrypted === 'object') {
        // Use decrypted values, fallback to plaintext during transition
        profile.name = decrypted.name ?? profile.name;
        profile.first_name = decrypted.first_name ?? profile.first_name;
        profile.last_name = decrypted.last_name ?? profile.last_name;
        profile.contact_number = decrypted.contact_number ?? profile.contact_number;
        profile.address = decrypted.address ?? profile.address;
      }
    } catch (decryptError) {
      // Log decryption error but continue with plaintext values as fallback
      console.error('Profile decryption failed, using plaintext values:', decryptError.message);
    }
  }
  
  const preferences = await fetchUserPreferences(profile.user_id);
  return buildProfileResponse(profile, preferences);
}

async function updateCanonicalProfile({ actor, targetLookup, body }) {
  const existingProfile = await findProfileOrThrow(targetLookup);
  const updates = extractProfileInput(body);

  if (!hasProfileUpdates(updates)) {
    throw new ServiceError(400, 'At least one profile field is required');
  }

  const attributes = {
    name: updates.username,
    first_name: updates.firstName,
    last_name: updates.lastName,
    email: updates.email,
    contact_number: updates.contactNumber,
    address: updates.address
  };

  // Week 6: Encrypt sensitive profile fields before storage
  // This ensures contact_number and address are encrypted at rest
  if (Object.values(attributes).some(v => v !== undefined && v !== null)) {
    try {
      const sensitiveData = {
        name: attributes.name,
        first_name: attributes.first_name,
        last_name: attributes.last_name,
        contact_number: attributes.contact_number,
        address: attributes.address
      };
      
      const encrypted = await encryptForDatabase(sensitiveData);
      
      // Store encrypted payload in dedicated columns
      attributes.profile_encrypted = encrypted.encrypted;
      attributes.profile_encryption_iv = encrypted.iv;
      attributes.profile_encryption_auth_tag = encrypted.authTag;
      attributes.profile_encryption_key_version = encrypted.keyVersion;
    } catch (encryptError) {
      // Log error but continue with plaintext as fallback during transition
      console.error('Profile encryption failed, storing plaintext values:', encryptError.message);
    }
  }

  const updatedProfile = await updateUser({
    userId: existingProfile.user_id,
    attributes
  });

  const mergedProfile = updatedProfile || existingProfile;

  if (updates.userImage) {
    mergedProfile.image_url = await saveImage(updates.userImage, existingProfile.user_id);
  }

  const preferences = await fetchUserPreferences(existingProfile.user_id);

  return {
    ...buildProfileResponse(mergedProfile, preferences),
    meta: {
      updatedBy: actor?.userId || null
    }
  };
}

module.exports = {
  PROFILE_CONTRACT_VERSION,
  buildCanonicalProfile,
  buildPreferenceSummary,
  buildProfileResponse,
  extractProfileInput,
  getCanonicalProfile,
  normalizeNameList,
  updateCanonicalProfile
};
