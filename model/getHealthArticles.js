const supabase = require('../dbConnection');

const getHealthArticles = async (query) => {
  const { data, error } = await supabase
    .from('health_articles')
    .select('*')
    .or(`title.ilike.%${query}%,tags.cs.{${query}}`);

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

module.exports = getHealthArticles;
