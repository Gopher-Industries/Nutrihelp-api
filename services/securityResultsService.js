const fs = require('fs');
const path = require('path');

const resultsPath = path.join(
  __dirname,
  '..',
  'security',
  'output',
  'scan-results.json'
);

const historyPath = path.join(
  __dirname,
  '..',
  'security',
  'output',
  'history'
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

const getScanHistory = () => {
  if (!fs.existsSync(historyPath)) {
    return {
      status: 200,
      history: []
    };
  }

  try {
    const files = fs
      .readdirSync(historyPath)
      .filter((file) => file.endsWith('.json'))
      .sort()
      .reverse();

    const history = files.map((file) => {
      const filePath = path.join(historyPath, file);
      const fileData = fs.readFileSync(filePath, 'utf8');
      const scan = JSON.parse(fileData);

      return {
        id: file,
        timestamp: scan.scanInformation?.timestamp || null,
        filesScanned: scan.scanInformation?.filesScanned || 0,
        rulesLoaded: scan.scanInformation?.rulesLoaded || 0,
        rulesOmitted: scan.scanInformation?.rulesOmitted || 0,
        findingsDetected: scan.scanInformation?.findingsDetected || 0,
        severity: scan.summary?.severity || {}
      };
    });

    return {
      status: 200,
      history
    };
  } catch (error) {
    console.error('Error reading security scan history: ', error);

    return {
      status: 500,
      error: 'Unable to read security scan history'
    };
  }
};

const getHistoricalScan = (scanId) => {
  try {
    // Prevent directory traversal
    const safeScanId = path.basename(scanId);

    if (
      safeScanId !== scanId ||
      !safeScanId.startsWith('scan-') ||
      !safeScanId.endsWith('.json')
    ) {
      return {
        status: 400,
        error: 'Invalid scan ID'
      };
    }

    const scanPath = path.join(historyPath, safeScanId);

    if (!fs.existsSync(scanPath)) {
      return {
        status: 404,
        error: 'Historical scan was not found'
      };
    }

    const scanData = fs.readFileSync(scanPath, 'utf8');
    const scan = JSON.parse(scanData);

    return {
      status: 200,
      scan
    };
  } catch (error) {
    console.error('Error reading historical security scan: ', error);

    return {
      status: 500,
      error: 'Unable to read historical security scan'
    };
  }
};

module.exports = {
  getLatestScanResults,
  getScanHistory,
  getHistoricalScan
};