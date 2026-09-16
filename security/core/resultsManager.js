const fs = require("fs");
const path = require("path");

class ResultsManager {
    constructor() {
        this.outputPath = path.join(
            __dirname,
            "..",
            "output",
            "scan-results.json"
        );
    }

    createResults(files, rules, findings, scanDurationMs, omittedRules = []) {
        const severitySummary = {
            Critical: 0,
            High: 0,
            Medium: 0,
            Low: 0,
            Informational: 0
        };

        findings.forEach((finding) => {
            if (Object.prototype.hasOwnProperty.call(
                severitySummary,
                finding.severity
            )) {
                severitySummary[finding.severity]++;
            }
        });

        return {
            framework: {
                name: "NutriHelp Secure Code Analysis Framework",
                version: "1.0.0"
            },

            scanInformation: {
                timestamp: new Date().toISOString(),
                scanDurationMs,
                filesScanned: files.length,
                rulesLoaded: rules.length,
                rulesOmitted: omittedRules.length,
                findingsDetected: findings.length
            },

            summary: {
                severity: severitySummary
            },

            omittedRules,
            findings
        };
    }

    saveResults(results) {
    try {
        const outputDirectory = path.dirname(this.outputPath);
        const historyDirectory = path.join(
            outputDirectory,
            "history"
        );

        if (!fs.existsSync(outputDirectory)) {
            fs.mkdirSync(outputDirectory, {
                recursive: true
            });
        }

        if (!fs.existsSync(historyDirectory)) {
            fs.mkdirSync(historyDirectory, {
                recursive: true
            });
        }

        const jsonResults = JSON.stringify(results, null, 2);

        // Save latest scan results
        fs.writeFileSync(
            this.outputPath,
            jsonResults,
            "utf8"
        );

        // Save historical copy
        const timestamp = results.scanInformation.timestamp
            .replace(/:/g, "-")
            .replace(/\./g, "-");

        const historyFilePath = path.join(
            historyDirectory,
            `scan-${timestamp}.json`
        );

        fs.writeFileSync(
            historyFilePath,
            jsonResults,
            "utf8"
        );

        return this.outputPath;
    } catch (error) {
        throw new Error(
            `Unable to save scan results: ${error.message}`
        );
    }
}
}

module.exports = ResultsManager;