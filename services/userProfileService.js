const getUserProfile = require('../model/getUserProfile');
const { updateUser, saveImage } = require('../model/updateUserProfile');
const fetchUserPreferences = require('../model/fetchUserPreferences');
const { ServiceError } = require('./serviceError');

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
