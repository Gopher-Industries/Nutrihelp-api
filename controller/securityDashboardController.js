const path = require('path');

const getSecurityDashboard = (req, res) => {
  try {
    const dashboardPath = path.join(
      __dirname,
      '..',
      'security',
      'dashboard',
      'index.html'
    );

    return res.sendFile(dashboardPath);
  } catch (error) {
    console.error('Error loading security dashboard: ', error);

    return res.status(500).json({
      success: false,
      error: 'Unable to load security dashboard',
    });
  }
};

module.exports = {
  getSecurityDashboard,
};