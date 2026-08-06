const fs = require("fs");
const path = require("path");

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

    createSafeMatchedText(filePath, lineNumber) {
        const fileName = path.basename(filePath);

        return `Source content redacted. Review ${fileName} at line ${lineNumber}.`;
    }

    analyseFile(filePath) {
        const findings = [];

        try {
            const fileContent = fs.readFileSync(filePath, "utf8");
            const lines = fileContent.split(/\r?\n/);

            let insideBlockComment = false;

            lines.forEach((line, index) => {
                const trimmedLine = line.trim();
                const lineNumber = index + 1;

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
                            line: lineNumber,
                            ruleId: rule.id,
                            ruleName: rule.name,
                            matchedText: this.createSafeMatchedText(
                                filePath,
                                lineNumber
                            ),
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
            console.error(
                `Unable to analyse ${filePath}: ${error.message}`
            );
        }

        return findings;
    }
}

module.exports = AnalysisEngine;