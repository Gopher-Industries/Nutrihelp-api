const { createClient } = require('@supabase/supabase-js');
const supabase = require('../database/supabaseClient');
const { wrapRepositoryError } = require('./repositoryError');

async function signUp({ email, password, options }) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    throw wrapRepositoryError('Failed to sign up auth user', error, { email });
  }
}

async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  } catch (error) {
    throw wrapRepositoryError('Failed to sign out auth session', error);
  }
}

async function upsertProfileWithAccessToken(accessToken, profile) {
  try {
    const authed = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    });

    const { error } = await authed
      .from('profiles')
      .upsert(profile, { onConflict: 'id' });

    if (error) {
      throw error;
    }
  } catch (error) {
    throw wrapRepositoryError('Failed to upsert profile with access token', error, {
      profileId: profile?.id
    });
  }
}

module.exports = {
  signOut,
  signUp,
  upsertProfileWithAccessToken
};
