const supabase = require('../dbConnection');
const { wrapRepositoryError } = require('./repositoryError');

async function createChatHistoryEntry(entry) {
  try {
    const { data, error } = await supabase
      .from('chat_history')
      .insert([entry])
      .select();

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to create chat history entry', error);
  }
}

async function getChatHistoryByUserId(userId) {
  try {
    const { data, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load chat history', error, { userId });
  }
}

async function deleteChatHistoryByUserId(userId) {
  try {
    const { data, error } = await supabase
      .from('chat_history')
      .delete()
      .eq('user_id', userId)
      .select();

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to delete chat history', error, { userId });
  }
}

module.exports = {
  createChatHistoryEntry,
  deleteChatHistoryByUserId,
  getChatHistoryByUserId
};
