const fs = require("fs");
const path = require("path");
const os = require("os");

const RuleManager = require("./ruleManager");
const AnalysisEngine = require("./analysisEngine");

const ruleManager = new RuleManager();
const rules = ruleManager.loadRules();

const nh197 = rules.find((rule) => rule.id === "NH197");

if (!nh197) {
    throw new Error("NH197 was not found.");
}

const analysisEngine = new AnalysisEngine([nh197]);

const testCases = [
    {
        name: "LDAP filter with request-controlled input",
        code: "const ldapFilter = `(uid=${req.body.username})`;",
        shouldMatch: true
    },
    {
        name: "Generic non-LDAP filter with request-controlled input",
        code: "const filter = `(category=${req.query.category})`;",
        shouldMatch: false
    },
    {
        name: "LDAP filter without direct request-controlled input",
        code: "const ldapFilter = `(uid=${username})`;",
        shouldMatch: false
    }
];

const tempDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "nutrihelp-rule-test-")
);

let failures = 0;

try {
    testCases.forEach((testCase, index) => {
        const testFile = path.join(
            tempDirectory,
            `nh197-test-${index + 1}.js`
        );

        fs.writeFileSync(testFile, testCase.code);

        const findings = analysisEngine.analyseFile(testFile);
        const matched = findings.some(
            (finding) => finding.ruleId === "NH197"
        );

        const passed = matched === testCase.shouldMatch;

        console.log(
            `${passed ? "PASS" : "FAIL"} - ${testCase.name}`
        );

        if (!passed) {
            failures++;
        }
    });
} finally {
    fs.rmSync(tempDirectory, {
        recursive: true,
        force: true
    });
}

if (failures > 0) {
    throw new Error(
        `NH197 regression testing failed: ${failures} test(s) failed.`
    );
}

console.log("NH197 regression tests passed.");