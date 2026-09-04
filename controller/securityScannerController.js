const {
  getLatestScanResults,
} = require('../services/securityResultsService');

const getScanResults = async (req, res) => {
  try {
    const result = getLatestScanResults();

    if (result.status !== 200) {
      return res.status(result.status).json({
        success: false,
        error: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      data: result.results,
    });
  } catch (error) {
    console.error('Error retrieving security scan results: ', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

module.exports = {
  getScanResults,
};