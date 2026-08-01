const ConfigurationManager = require("./configurationManager");
const FileDiscovery = require("./fileDiscovery");
const RuleManager = require("./ruleManager");
const AnalysisEngine = require("./analysisEngine");

try {
    const configurationManager = new ConfigurationManager();
    const configuration = configurationManager.loadConfiguration();

    const fileDiscovery = new FileDiscovery(configuration);
    const files = fileDiscovery.discoverFiles();

    const ruleManager = new RuleManager();
    const rules = ruleManager.loadRules();

    const analysisEngine = new AnalysisEngine(rules);
    const findings = analysisEngine.analyseFiles(files);

    console.log(`\nFiles analysed: ${files.length}`);
    console.log(`Findings detected: ${findings.length}`);
    console.log(findings);
} catch (error) {
    console.error(error.message);
}