const ConfigurationManager = require("./configurationManager");
const FileDiscovery = require("./fileDiscovery");
const RuleManager = require("./ruleManager");
const AnalysisEngine = require("./analysisEngine");
const ResultsManager = require("./resultsManager");

/**
 * Runs NutriHelp static security analysis.
 * Returns completed scan results.
 */
const runSecurityScan = (omittedRuleIds = []) => {
    const configurationManager = new ConfigurationManager();
    const configuration = configurationManager.loadConfiguration();

    const fileDiscovery = new FileDiscovery(configuration);
    const files = fileDiscovery.discoverFiles();

    const ruleManager = new RuleManager();
    const allRules = ruleManager.loadRules();

    // Store details for rules omitted from this scan.
    const omittedRules = allRules
        .filter((rule) => omittedRuleIds.includes(rule.id))
        .map((rule) => ({
            id: rule.id,
            name: rule.name,
            description: rule.description || "",
            severity: rule.severity
        }));

    // Exclude selected rules from the analysis.
    const rules = allRules.filter(
        (rule) => !omittedRuleIds.includes(rule.id)
    );

    const analysisEngine = new AnalysisEngine(rules);

    const startTime = Date.now();
    const findings = analysisEngine.analyseFiles(files);
    const scanDurationMs = Date.now() - startTime;

    const resultsManager = new ResultsManager();

    const results = resultsManager.createResults(
        files,
        rules,
        findings,
        scanDurationMs,
        omittedRules
    );

    const outputPath = resultsManager.saveResults(results);

    console.log(`\nFiles analysed: ${files.length}`);
    console.log(`Findings detected: ${findings.length}`);
    console.log(`Scan results saved to: ${outputPath}`);

    return results;
};

// Allows other parts of the backend to trigger a scan.
module.exports = runSecurityScan;

// Preserve the existing command:
// node security/core/testAnalysisEngine.js
if (require.main === module) {
    try {
        runSecurityScan();
    } catch (error) {
        console.error(error.message);
    }
}