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

            return rules.map((rule) => {
                if (!rule.id || !rule.name || !rule.pattern) {
                    throw new Error(
                        "Each rule must include an id, name, and pattern."
                    );
                }

                try {
                    return {
                        ...rule,
                        compiledPattern: new RegExp(rule.pattern, "i")
                    };
                } catch (error) {
                    throw new Error(
                        `Invalid pattern for rule ${rule.id}: ${error.message}`
                    );
                }
            });
        } catch (error) {
            throw new Error(
                `Unable to load security rules: ${error.message}`
            );
        }
    }
}

module.exports = RuleManager;