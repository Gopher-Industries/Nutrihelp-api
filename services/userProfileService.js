const getUserProfile = require('../model/getUserProfile');
const { updateUser, saveImage } = require('../model/updateUserProfile');
const fetchUserPreferences = require('../model/fetchUserPreferences');
const { ServiceError } = require('./serviceError');
const { decryptFromDatabase, encryptForDatabase } = require('./encryptionService');
const logger = require('../utils/logger');

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

function toEmailLocalPart(value) {
  const normalized = value != null ? String(value).trim().toLowerCase() : '';
  if (!normalized) return null;
  const atIndex = normalized.indexOf('@');
  if (atIndex <= 0) return null;
  return normalized.slice(0, atIndex);
}

function deriveUsername(profile, fullName) {
  const explicitUsername = profile.username != null ? String(profile.username).trim() : '';
  if (explicitUsername) return explicitUsername;

  const legacyName = profile.name != null ? String(profile.name).trim() : '';
  const normalizedFullName = fullName != null ? String(fullName).trim() : '';

  // Legacy records often store display name in `name` (e.g. "First Last").
  // Keep short slug-like values as username, otherwise fallback to email local-part.
  if (legacyName && legacyName !== normalizedFullName && !/\s/.test(legacyName)) {
    return legacyName;
  }

  return toEmailLocalPart(profile.email) || legacyName || null;
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
    username: deriveUsername(profile, fullName),
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
    message: 'Profile retrieved successfully',
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

  if (profile.profile_encrypted && profile.profile_encryption_iv && profile.profile_encryption_auth_tag) {
    // Decryption failure is a hard error — falling back to plaintext would silently
    // serve stale or wrong data and would mask key-mismatch or corruption issues.
    const decrypted = await decryptFromDatabase(profile, {
      encrypted: 'profile_encrypted',
      iv: 'profile_encryption_iv',
      authTag: 'profile_encryption_auth_tag'
    });

    if (!decrypted || typeof decrypted !== 'object') {
      throw new ServiceError(500, 'Profile decryption produced an invalid result. Contact support.');
    }

    profile.name = decrypted.name ?? profile.name;
    profile.first_name = decrypted.first_name ?? profile.first_name;
    profile.last_name = decrypted.last_name ?? profile.last_name;
    // Sensitive fields must come exclusively from the encrypted source once stored encrypted.
    profile.contact_number = decrypted.contact_number ?? null;
    profile.address = decrypted.address ?? null;

    // Dual-storage check: warn if plaintext columns were not cleared by a prior write.
    // This indicates the record pre-dates the encryption rollout and must be migrated.
    if (decrypted.contact_number && profile.contact_number) {
      logger.warn('[userProfileService] Dual-storage detected on user ' + profile.user_id +
        ': contact_number exists in both encrypted blob and plaintext column. ' +
        'Run scripts/migrate-encrypt-user-profiles.js to back-fill and clear plaintext.');
    }
    if (decrypted.address && profile.address) {
      logger.warn('[userProfileService] Dual-storage detected on user ' + profile.user_id +
        ': address exists in both encrypted blob and plaintext column. ' +
        'Run scripts/migrate-encrypt-user-profiles.js to back-fill and clear plaintext.');
    }
  } else if (profile.contact_number || profile.address) {
    // Row has no encrypted payload but has plaintext sensitive data — pre-migration record.
    logger.warn('[userProfileService] Unencrypted sensitive data on user ' + profile.user_id +
      ': profile has not been migrated to encrypted storage. ' +
      'Run scripts/migrate-encrypt-user-profiles.js to encrypt this record.');
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

  // Week 6: Encrypt sensitive profile fields before storage.
  // Encryption is mandatory — if it fails the update is rejected so sensitive
  // data is never written in plaintext. After a successful encrypt the plaintext
  // columns for contact_number and address are explicitly nulled so the same
  // data is not persisted in both the encrypted blob and the old columns.
  if (Object.values(attributes).some(v => v !== undefined && v !== null)) {
    const sensitiveData = {
      name: attributes.name,
      first_name: attributes.first_name,
      last_name: attributes.last_name,
      contact_number: attributes.contact_number,
      address: attributes.address
    };

    // Throws on key-load or cipher failure — deliberately not caught here.
    const encrypted = await encryptForDatabase(sensitiveData);

    attributes.profile_encrypted = encrypted.encrypted;
    attributes.profile_encryption_iv = encrypted.iv;
    attributes.profile_encryption_auth_tag = encrypted.authTag;
    attributes.profile_encryption_key_version = encrypted.keyVersion;

    // Clear the plaintext-column values so they are not stored alongside
    // the encrypted blob. Rows that pre-date encryption will retain their
    // existing column values until a migration nulls them out.
    attributes.contact_number = null;
    attributes.address = null;
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
    message: 'Profile updated successfully',
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
