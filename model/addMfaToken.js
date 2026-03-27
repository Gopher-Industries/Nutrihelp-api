const mfaRepository = require('../repositories/mfaRepository');

async function addMfaToken(userId, token) {
  try {
    const currentDate = new Date();
    const expiryDate = new Date(currentDate.getTime() + 10 * 60000); // 10 minutes

    // Ensure userId is stored as integer
    const parsedUserId = parseInt(userId, 10);

    return await mfaRepository.createMfaToken({
      userId: parsedUserId,
      token,
      expiry: expiryDate.toISOString(),
      isUsed: false
    });
  } catch (error) {
    console.error("[addMfaToken] MFA token creation failed:", error);
    throw error;
  }
}

async function verifyMfaToken(userId, token) {
  try {
    // Ensure userId is treated as integer here too
    const parsedUserId = parseInt(userId, 10);

    const mfaToken = await mfaRepository.findLatestValidMfaToken(parsedUserId, token);
    if (!mfaToken) {
      return false;
    }

    // Check expiry BEFORE updating
    const now = new Date();
    const expiryDate = new Date(mfaToken.expiry);
    if (now > expiryDate) {
      return false;
    }

    // Mark token as used
    await mfaRepository.markMfaTokenUsed(mfaToken.id);

    return true;
  } catch (error) {
    console.error("[addMfaToken] MFA token verification failed:", error);
    throw error;
  }
}

module.exports = { addMfaToken, verifyMfaToken };
