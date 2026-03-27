const supabase = require('../dbConnection');
const { wrapRepositoryError } = require('./repositoryError');

async function createContactUsMessage({ name, email, subject, message }) {
  try {
    const { data, error } = await supabase
      .from('contactus')
      .insert({ name, email, subject, message })
      .select();

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to create contact us message', error);
  }
}

module.exports = {
  createContactUsMessage
};
