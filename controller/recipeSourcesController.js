const recipeSources = require('../services/recipeSources');
const mapperService = require('../services/recipeSources/mapperService');

exports.searchSources = async (req, res) => {
  try {
    const { q } = req.query;
    const results = await recipeSources.searchAll(q);
    return res.status(200).json({ success: true, data: { results } });
  } catch (err) {
    return res.status(502).json({ success: false, error: 'Recipe source search failed' });
  }
};

exports.mapSource = async (req, res) => {
  const { source, external_id: externalId } = req.body;

  const adapter = recipeSources.getAdapter(source);
  if (!adapter) {
    return res.status(400).json({ success: false, error: `Unknown recipe source "${source}"` });
  }

  let sourceRecipe;
  try {
    sourceRecipe = await adapter.lookup(externalId);
  } catch (err) {
    return res.status(502).json({ success: false, error: 'Recipe source lookup failed' });
  }

  if (!sourceRecipe) {
    return res.status(404).json({ success: false, error: 'Recipe not found at source' });
  }

  try {
    const result = await mapperService.mapRecipe(sourceRecipe);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Recipe mapping failed' });
  }
};
