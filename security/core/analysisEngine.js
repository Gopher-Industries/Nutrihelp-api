const fs = require("fs");

class AnalysisEngine {
    constructor(rules) {
        this.rules = rules;
    }

    analyseFiles(filePaths) {
        const findings = [];

        filePaths.forEach((filePath) => {
            const fileFindings = this.analyseFile(filePath);
            findings.push(...fileFindings);
        });

        return findings;
    }

    analyseFile(filePath) {
        const findings = [];

        try {
            const fileContent = fs.readFileSync(filePath, "utf8");
            const lines = fileContent.split(/\r?\n/);

            let insideBlockComment = false;

            lines.forEach((line, index) => {
                const trimmedLine = line.trim();

                if (insideBlockComment) {
                    if (trimmedLine.includes("*/")) {
                        insideBlockComment = false;
                    }
                    return;
                }

                if (trimmedLine.startsWith("/*")) {
                    if (!trimmedLine.includes("*/")) {
                        insideBlockComment = true;
                    }
                    return;
                }

                if (
                    trimmedLine.startsWith("//") ||
                    trimmedLine.startsWith("*") ||
                    trimmedLine.length === 0
                ) {
                    return;
                }

                this.rules.forEach((rule) => {
                    const pattern = new RegExp(rule.pattern, "i");

                    if (pattern.test(line)) {
                        findings.push({
                            file: filePath,
                            line: index + 1,
                            ruleId: rule.id,
                            ruleName: rule.name,
                            matchedText: trimmedLine,
                            severity: rule.severity,
                            confidence: rule.confidence,
                            cwe: rule.cwe,
                            owasp: rule.owasp,
                            recommendation: rule.recommendation
                        });
                    }
                });
            });
        } catch (error) {
            console.error(`Unable to analyse ${filePath}: ${error.message}`);
        }

        return findings;
    }
}

module.exports = AnalysisEngine;