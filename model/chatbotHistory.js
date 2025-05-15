const supabase = require('../dbConnection.js');

async function addHistory(user_id, user_input, chatbot_response) {
  try {
    const { data, error } = await supabase
      .from('chat_history')
      .insert([
        {
          user_id,
          user_input,
          chatbot_response,
          timestamp: new Date().toISOString()
        }
      ]);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding chat history:', error);
    throw error;
  }
}

async function getHistory(user_id) {
  try {
    const { data, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', user_id)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting chat history:', error);
    throw error;
  }
}

async function deleteHistory(user_id) {
  try {
    const { data, error } = await supabase
      .from('chat_history')
      .delete()
      .eq('user_id', user_id);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error deleting chat history:', error);
    throw error;
  }
}

module.exports = { addHistory, getHistory, deleteHistory };