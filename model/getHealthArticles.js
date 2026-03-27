const lookupRepository = require('../repositories/lookupRepository');

const getHealthArticles = async (query) => {
  return lookupRepository.getHealthArticles(query);
};

module.exports = getHealthArticles;
