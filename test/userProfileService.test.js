const { expect } = require('chai');
const proxyquire = require('proxyquire').noCallThru();

describe('User Profile Service', () => {
  it('builds a canonical profile contract with normalized preference summary', async () => {
    const service = proxyquire('../services/userProfileService', {
      '../model/getUserProfile': async () => ({
        user_id: 7,
        email: 'user@example.com',
        name: 'alex-user',
        first_name: 'Alex',
        last_name: 'Nguyen',
        contact_number: '0400000000',
        address: 'Melbourne',
        image_url: 'https://cdn.example.com/profile.png',
        account_status: 'active',
        registration_date: '2025-01-01T00:00:00.000Z',
        last_login: '2026-04-01T00:00:00.000Z',
        mfa_enabled: true,
        user_roles: { role_name: 'user' }
      }),
      '../model/fetchUserPreferences': async () => ({
        dietary_requirements: [{ id: 1, name: 'High Protein' }],
        allergies: [{ id: 2, name: 'Peanut' }],
        cuisines: [],
        dislikes: [],
        health_conditions: [{ id: 4, name: 'Diabetes' }],
        spice_levels: [],
        cooking_methods: [{ id: 8, name: 'Grilled' }]
      }),
      '../model/updateUserProfile': {}
    });

    const result = await service.getCanonicalProfile({ userId: 7 });

    expect(result).to.deep.equal({
      success: true,
      contractVersion: 'user-profile-v1',
      profile: {
        id: 7,
        email: 'user@example.com',
        username: 'alex-user',
        firstName: 'Alex',
        lastName: 'Nguyen',
        fullName: 'Alex Nguyen',
        contactNumber: '0400000000',
        address: 'Melbourne',
        imageUrl: 'https://cdn.example.com/profile.png',
        role: 'user',
        mfaEnabled: true,
        accountStatus: 'active',
        registrationDate: '2025-01-01T00:00:00.000Z',
        lastLogin: '2026-04-01T00:00:00.000Z'
      },
      preferenceSummary: {
        dietaryRequirements: ['high protein'],
        allergies: ['peanut'],
        cuisines: [],
        dislikes: [],
        healthConditions: ['diabetes'],
        spiceLevels: [],
        cookingMethods: ['grilled'],
        hasPreferences: true
      }
    });
  });

  it('maps legacy update payload fields into the shared model update call', async () => {
    const updateUser = async ({ userId, attributes }) => ({
      user_id: userId,
      name: attributes.name,
      first_name: attributes.first_name,
      last_name: attributes.last_name,
      email: attributes.email,
      contact_number: attributes.contact_number,
      address: attributes.address,
      image_url: null,
      mfa_enabled: false,
      account_status: 'active',
      user_roles: { role_name: 'user' }
    });

    const service = proxyquire('../services/userProfileService', {
      '../model/getUserProfile': async () => ({
        user_id: 12,
        email: 'legacy@example.com',
        name: 'legacy',
        user_roles: { role_name: 'user' }
      }),
      '../model/updateUserProfile': {
        updateUser,
        saveImage: async () => 'https://cdn.example.com/new.png'
      },
      '../model/fetchUserPreferences': async () => ({
        dietary_requirements: [],
        allergies: [],
        cuisines: [],
        dislikes: [],
        health_conditions: [],
        spice_levels: [],
        cooking_methods: []
      })
    });

    const result = await service.updateCanonicalProfile({
      actor: { userId: 12 },
      targetLookup: { userId: 12 },
      body: {
        first_name: 'Legacy',
        last_name: 'User',
        contact_number: '12345',
        address: 'Geelong',
        user_image: 'base64-image'
      }
    });

    expect(result.profile).to.deep.include({
      id: 12,
      firstName: 'Legacy',
      lastName: 'User',
      contactNumber: '12345',
      address: 'Geelong',
      imageUrl: 'https://cdn.example.com/new.png'
    });
    expect(result.meta).to.deep.equal({ updatedBy: 12 });
  });
});
