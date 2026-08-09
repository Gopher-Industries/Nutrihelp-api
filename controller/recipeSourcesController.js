const recipeSources = require('../services/recipeSources');

exports.searchSources = async (req, res) => {
  try {
    const { q } = req.query;
    const results = await recipeSources.searchAll(q);
    return res.status(200).json({ success: true, data: { results } });
  } catch (err) {
    return res.status(502).json({ success: false, error: 'Recipe source search failed' });
  }
};
