const fs = require('fs');
const path = require('path');

const resultsPath = path.join(
  __dirname,
  '..',
  'security',
  'output',
  'scan-results.json'
);

const getLatestScanResults = () => {
  if (!fs.existsSync(resultsPath)) {
    return {
      status: 404,
      error: 'No security scan results were found'
    };
  }

  try {
    const resultsData = fs.readFileSync(resultsPath, 'utf8');
    const results = JSON.parse(resultsData);

    return {
      status: 200,
      results
    };
  } catch (error) {
    console.error('Error reading security scan results: ', error);

    return {
      status: 500,
      error: 'Unable to read security scan results'
    };
  }
};

module.exports = {
  getLatestScanResults
};