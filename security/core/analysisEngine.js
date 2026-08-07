const fs = require("fs");
const path = require("path");

class AnalysisEngine {
    constructor(rules) {
        this.rules = rules;
    }

    analyseFiles(filePaths) {
        const findings = [];
        const analysisErrors = [];

        filePaths.forEach((filePath) => {
            try {
                const fileFindings = this.analyseFile(filePath);
                findings.push(...fileFindings);
            } catch (error) {
                analysisErrors.push({
                    file: filePath,
                    error: error.message
                });
            }
        });

        if (analysisErrors.length > 0) {
            const error = new Error(
                `Security scan failed while analysing ${analysisErrors.length} file(s).`
            );

            error.analysisErrors = analysisErrors;
            throw error;
        }

        return findings;
    }

    createSafeMatchedText(filePath, lineNumber) {
        const fileName = path.basename(filePath);

        return `Source content redacted. Review ${fileName} at line ${lineNumber}.`;
    }

    analyseFile(filePath) {
        const findings = [];

        let fileContent;

        try {
            fileContent = fs.readFileSync(filePath, "utf8");
        } catch (error) {
            throw new Error(`Unable to read file: ${error.message}`);
        }

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
                if (rule.compiledPattern.test(line)) {
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

        return findings;
    }
}

module.exports = AnalysisEngine;