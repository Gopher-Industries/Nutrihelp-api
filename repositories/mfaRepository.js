const supabase = require('../dbConnection');
const { wrapRepositoryError } = require('./repositoryError');

async function createMfaToken({ userId, token, expiry, isUsed = false }) {
  try {
    const { data, error } = await supabase
      .from('mfatokens')
      .insert({
        user_id: userId,
        token,
        expiry,
        is_used: isUsed
      })
      .select();

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to create MFA token', error, { userId });
  }
}

async function findLatestValidMfaToken(userId, token) {
  try {
    const { data, error } = await supabase
      .from('mfatokens')
      .select('id, token, expiry, is_used')
      .eq('user_id', userId)
      .eq('token', token)
      .eq('is_used', false)
      .order('expiry', { ascending: false })
      .limit(1);

    if (error) throw error;
    return data?.[0] || null;
  } catch (error) {
    throw wrapRepositoryError('Failed to load MFA token', error, { userId });
  }
}

async function markMfaTokenUsed(id) {
  try {
    const { error } = await supabase
      .from('mfatokens')
      .update({ is_used: true })
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    throw wrapRepositoryError('Failed to mark MFA token used', error, { id });
  }
}

module.exports = {
  createMfaToken,
  findLatestValidMfaToken,
  markMfaTokenUsed
};
