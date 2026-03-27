const supabase = require('../dbConnection');
const { wrapRepositoryError } = require('./repositoryError');

async function getAllFromTable(table, select = '*') {
  try {
    const { data, error } = await supabase
      .from(table)
      .select(select);

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError(`Failed to load lookup table ${table}`, error, { table });
  }
}

async function getHealthArticles(query) {
  try {
    const { data, error } = await supabase
      .from('health_articles')
      .select('*')
      .or(`title.ilike.%${query}%,tags.cs.{${query}}`);

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load health articles', error, { query });
  }
}

module.exports = {
  getAllFromTable,
  getHealthArticles
};
