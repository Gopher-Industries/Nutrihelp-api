const supabase = require('../dbConnection.js');

async function addHistory(user_id, user_input, chatbot_response) {
  return "Sample data"
}

async function getHistory(user_id) {
  return "Sample data"
}
async function deleteHistory(user_id) {
  return "Sample data"
}

module.exports = { addHistory, getHistory, deleteHistory };