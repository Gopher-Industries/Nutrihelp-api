const RuleManager = require("./ruleManager");

try {
    const ruleManager = new RuleManager();
    const rules = ruleManager.loadRules();

    console.log(`Loaded ${rules.length} security rules:`);
    console.log(rules);
} catch (error) {
    console.error(error.message);
}