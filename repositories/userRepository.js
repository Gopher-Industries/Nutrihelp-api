const supabase = require('../dbConnection');
const { wrapRepositoryError } = require('./repositoryError');

async function findByEmail(email) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data || null;
  } catch (error) {
    throw wrapRepositoryError('Failed to load user by email', error, { email });
  }
}

async function findCredentialsByEmail(email) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        user_id,
        email,
        password,
        mfa_enabled,
        role_id,
        account_status,
        email_verified,
        name,
        first_name,
        last_name,
        contact_number,
        address,
        registration_date,
        last_login,
        user_roles (
          id,
          role_name
        )
      `)
      .eq('email', email.trim())
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data || null;
  } catch (error) {
    throw wrapRepositoryError('Failed to load user credentials', error, { email });
  }
}

async function findBasicById(userId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        user_id,
        email,
        name,
        role_id,
        account_status,
        user_roles (
          id,
          role_name
        )
      `)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data || null;
  } catch (error) {
    throw wrapRepositoryError('Failed to load user by id', error, { userId });
  }
}

async function findProfileById(userId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        user_id,
        email,
        name,
        first_name,
        last_name,
        registration_date,
        last_login,
        account_status,
        user_roles!inner(role_name)
      `)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data || null;
  } catch (error) {
    throw wrapRepositoryError('Failed to load user profile', error, { userId });
  }
}

async function createUser({
  name,
  email,
  password,
  mfaEnabled,
  contactNumber,
  address,
  roleId = 7,
  accountStatus = 'active',
  emailVerified = true,
  firstName = null,
  lastName = null,
  registrationDate = null
}) {
  try {
    const payload = {
      name,
      email,
      password,
      mfa_enabled: mfaEnabled,
      contact_number: contactNumber,
      address,
      role_id: roleId,
      account_status: accountStatus,
      email_verified: emailVerified,
      first_name: firstName,
      last_name: lastName
    };

    if (registrationDate) {
      payload.registration_date = registrationDate;
    }

    const { data, error } = await supabase
      .from('users')
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data || null;
  } catch (error) {
    throw wrapRepositoryError('Failed to create user', error, { email });
  }
}

async function updateLastLogin(userId, lastLogin) {
  try {
    const { error } = await supabase
      .from('users')
      .update({ last_login: lastLogin })
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
  } catch (error) {
    throw wrapRepositoryError('Failed to update last login', error, { userId });
  }
}

async function findContactNumberByEmail(email) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('contact_number')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data?.contact_number || null;
  } catch (error) {
    throw wrapRepositoryError('Failed to load contact number by email', error, { email });
  }
}

async function findByIdentifier(identifier) {
  try {
    const byEmail = await findByEmail(identifier);
    if (byEmail) {
      return byEmail;
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('name', identifier)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data || null;
  } catch (error) {
    throw wrapRepositoryError('Failed to load user by identifier', error, { identifier });
  }
}

async function updateByUserId(userId, updates) {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data || null;
  } catch (error) {
    throw wrapRepositoryError('Failed to update user profile', error, { userId });
  }
}

async function deleteByUserId(userId) {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
    return true;
  } catch (error) {
    throw wrapRepositoryError('Failed to delete user', error, { userId });
  }
}

async function findPasswordByUserId(userId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('user_id,password')
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load user password', error, { userId });
  }
}

async function findProfileByEmail(email) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('user_id,name,first_name,last_name,email,contact_number,mfa_enabled,address,image_id')
      .eq('email', email);

    if (error) {
      throw error;
    }
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load user profile by email', error, { email });
  }
}

async function updateByEmail(email, updates, select = '*') {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('email', email)
      .select(select);

    if (error) {
      throw error;
    }
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to update user by email', error, { email });
  }
}

async function updatePasswordByUserId(userId, password) {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ password })
      .eq('user_id', userId)
      .select('user_id,password');

    if (error) {
      throw error;
    }
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to update user password', error, { userId });
  }
}

async function setUserImageId(userId, imageId) {
  try {
    const { error } = await supabase
      .from('users')
      .update({ image_id: imageId })
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
    return true;
  } catch (error) {
    throw wrapRepositoryError('Failed to set user image id', error, { userId, imageId });
  }
}

module.exports = {
  createUser,
  deleteByUserId,
  findBasicById,
  findByEmail,
  findByIdentifier,
  findContactNumberByEmail,
  findCredentialsByEmail,
  findPasswordByUserId,
  findProfileByEmail,
  findProfileById,
  setUserImageId,
  updateByEmail,
  updateByUserId,
  updateLastLogin
  ,updatePasswordByUserId
};
