// Import the reusable NutriHelp security scanner.
const runSecurityScan = require('../security/core/testAnalysisEngine');
const RuleManager = require('../security/core/ruleManager');

/**
 * Runs a new security scan from the dashboard.
 */
const runScan = async (req, res) => {
  try {
    const omittedRules = req.body?.omittedRules || [];
    const results = runSecurityScan(omittedRules);

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    // Log scanner errors for backend troubleshooting.
    console.error('Error running security scan: ', error);

    return res.status(500).json({
      success: false,
      error: 'Unable to run security scan',
    });
  }
};
/**
 * Returns the available security rules for dashboard selection.
 */
const getRules = (req, res) => {
  try {
    const ruleManager = new RuleManager();
    const rules = ruleManager.loadRules();

    const ruleList = rules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      description: rule.description || '',
      severity: rule.severity
    }));

    return res.status(200).json({
      success: true,
      data: ruleList
    });
  } catch (error) {
    console.error('Error loading security rules: ', error);

    return res.status(500).json({
      success: false,
      error: 'Unable to load security rules'
    });
  }
};

module.exports = {
  runScan,
  getRules,
};