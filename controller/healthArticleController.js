const getHealthArticles = require('../model/getHealthArticles');

const searchHealthArticles = async (req, res) => {
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter' });
  }

  try {
    const articles = await getHealthArticles(query);
    res.status(200).json({ articles });
  } catch (error) {
    console.error('Error searching articles:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  searchHealthArticles,
};
