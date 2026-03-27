const supabase = require('../dbConnection');
const { wrapRepositoryError } = require('./repositoryError');

async function createUserFeedback({
  userId,
  name,
  contactNumber,
  email,
  experience,
  comments
}) {
  try {
    const { data, error } = await supabase
      .from('userfeedback')
      .insert({
        user_id: userId,
        name,
        contact_number: contactNumber,
        email,
        experience,
        comments
      })
      .select();

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to create user feedback', error);
  }
}

async function createImageClassificationFeedback(payload) {
  try {
    const { data, error } = await supabase
      .from('image_classification_feedback')
      .insert(payload)
      .select();

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to create image classification feedback', error);
  }
}

module.exports = {
  createImageClassificationFeedback,
  createUserFeedback
};
