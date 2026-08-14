const ConfigurationManager = require("./configurationManager");
const FileDiscovery = require("./fileDiscovery");
const RuleManager = require("./ruleManager");
const AnalysisEngine = require("./analysisEngine");
const ResultsManager = require("./resultsManager");

try {
    const configurationManager = new ConfigurationManager();
    const configuration = configurationManager.loadConfiguration();

    const fileDiscovery = new FileDiscovery(configuration);
    const files = fileDiscovery.discoverFiles();

    const ruleManager = new RuleManager();
    const rules = ruleManager.loadRules();

    const analysisEngine = new AnalysisEngine(rules);

    const startTime = Date.now();
    const findings = analysisEngine.analyseFiles(files);
    const scanDurationMs = Date.now() - startTime;

    const resultsManager = new ResultsManager();

    const results = resultsManager.createResults(
        files,
        rules,
        findings,
        scanDurationMs
    );

    const outputPath = resultsManager.saveResults(results);

    console.log(`\nFiles analysed: ${files.length}`);
    console.log(`Findings detected: ${findings.length}`);
    console.log(`Scan results saved to: ${outputPath}`);

} catch (error) {
    console.error(error.message);
}