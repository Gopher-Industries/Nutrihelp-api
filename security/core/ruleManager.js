const fs = require("fs");
const path = require("path");

class RuleManager {
    constructor() {
        this.rulesPath = path.join(
            __dirname,
            "..",
            "rules",
            "rules.json"
        );
    }

    loadRules() {
        try {
            const ruleData = fs.readFileSync(this.rulesPath, "utf8");
            const rules = JSON.parse(ruleData);

            if (!Array.isArray(rules)) {
                throw new Error("Rules file must contain an array.");
            }

            return rules;
        } catch (error) {
            throw new Error(
                `Unable to load security rules: ${error.message}`
            );
        }
    }
}

module.exports = RuleManager;