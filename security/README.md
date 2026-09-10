# NutriHelp Secure Code Analysis Framework

**Developed by:** John Patrick Thomas

A lightweight static code analysis framework developed for the NutriHelp backend to identify potentially insecure coding patterns in JavaScript source files.

The framework discovers selected backend files, applies a configurable library of security rules, produces structured findings, and presents the results through an interactive web dashboard. Its purpose is to support secure coding reviews by making potential weaknesses easier to identify, prioritise, and investigate.

## Key Features

- Configurable JavaScript source-code scanning
- JSON-based security rule library
- Pattern-based detection of potentially insecure code
- Severity-based findings: Critical, High, Medium, Low, and Informational
- CWE / security guidance mapping where defined by individual rules
- File path and line-number context for findings
- Recommendations for detected issues
- Overall 0–100 Risk Score
- Interactive dashboard with severity visualisation
- Search and severity filtering
- Ability to omit selected rules from an individual scan
- Display of omitted rules in scan results
- Structured JSON scan output
- REST API integration with the NutriHelp backend

---

## Project Scope

The NutriHelp repository already contained several security-related files before this Secure Code Analysis Framework was developed.

**Not every file inside the `security/` directory belongs to this project.**

The framework developed for this project consists of the scanner configuration, analysis components, rule library, dashboard, generated scan output, and supporting scanner tests listed below.

### Files belonging to this project

```text
security/
├── config/
│   └── scanner-config.json
│
├── core/
│   ├── analysisEngine.js
│   ├── configurationManager.js
│   ├── fileDiscovery.js
│   ├── resultsManager.js
│   ├── ruleManager.js
│   ├── testAnalysisEngine.js
│   ├── testConfiguration.js
│   ├── testfileDiscovery.js
│   └── testRuleManager.js
│
├── dashboard/
│   └── index.html
│
├── output/
│   └── scan-results.json
│
└── rules/
    └── rules.json
```

The backend integration for the framework also includes:

```text
controller/securityScanController.js
routes/securityScanner.js
```

### Existing security files not part of this project

The following files are located in the repository's `security/` directory but are **pre-existing or separate security functionality and are not part of the Secure Code Analysis Framework**:

```text
security/reportGenerator.js
security/runAssessment.js
security/securityChecklist.js
security/SECURITY_CHECKLIST.md
security/semgrep_rules.yml
security/test.js
```

These files have intentionally been left separate from the framework and should not be interpreted as components developed as part of this project.

---

## Architecture

The framework is separated into components so configuration, file discovery, rule management, analysis, and result generation remain independent.

### Configuration Manager

`configurationManager.js` loads the scanner configuration from:

```text
security/config/scanner-config.json
```

The configuration controls which backend directories are scanned, which file types are supported, and which locations are excluded.

### File Discovery

`fileDiscovery.js` recursively searches the configured backend directories and identifies supported source files for analysis.

The current framework is focused on JavaScript source files.

### Rule Manager

`ruleManager.js` loads and validates security rules from:

```text
security/rules/rules.json
```

Rules use identifiers such as:

```text
NH001
NH002
NH003
...
```

Each rule defines the information required by the scanner, including its name, description, severity, detection pattern, and supporting security guidance where applicable.

### Analysis Engine

`analysisEngine.js` applies the loaded rules to the discovered source files.

When a rule matches source code, the engine creates a finding containing contextual information such as the affected file, line number, matched rule, severity, and recommendation.

### Results Manager

`resultsManager.js` converts the scan findings into a structured result set.

Generated results include:

- Scan timestamp
- Scan duration
- Number of files scanned
- Number of rules loaded
- Number of rules omitted
- Total findings
- Severity totals
- Omitted-rule information
- Individual findings

Results are written to:

```text
security/output/scan-results.json
```

---

## Scan Process

```text
Scanner Configuration
        ↓
File Discovery
        ↓
Security Rule Loading
        ↓
Rule Validation
        ↓
Source Code Analysis
        ↓
Security Findings
        ↓
Results Generation
        ↓
JSON Output / Dashboard
```

This structure allows scan locations and security rules to be changed without rewriting the core scanner logic.

---

## Security Rules

Security detection rules are stored in:

```text
security/rules/rules.json
```

The rule library is designed to be extendable. Additional rules can be added without modifying the analysis engine itself.

A rule can define:

- Rule ID
- Rule name
- Description
- Severity
- Detection pattern
- CWE or related security mapping
- Recommendation

The scanner validates rule patterns before using them so invalid regular expressions can be identified before analysis begins.

### Rule Omission

The dashboard allows individual rules to be omitted before running a scan.

Omitted rules are:

- Excluded from that scan
- Counted in the scan metadata
- Displayed in the **Omitted Rules** section
- Recorded in the generated scan results

---

## Risk Score

The dashboard calculates an overall Risk Score from the severity of the findings.

| Severity | Points per Finding |
|---|---:|
| Critical | 20 |
| High | 10 |
| Medium | 5 |
| Low | 2 |

The total Risk Score is capped at **100**.

### Risk Levels

| Score | Risk Level | Dashboard Colour |
|---:|---|---|
| 0–19 | Minimal | Green |
| 20–49 | Low | Yellow |
| 50–80 | Medium | Orange |
| 81–100 | High | Red |

The Risk Score provides a quick overview of the scan result. Individual findings should still be reviewed because the score does not replace investigation of the underlying source code.

---

## Dashboard

The Secure Code Analysis Dashboard is located at:

```text
security/dashboard/index.html
```

When the backend is running, the dashboard is available at:

```text
http://localhost:8081/security-dashboard
```

The dashboard provides:

- Latest scan metadata
- Files scanned
- Rules loaded
- Findings detected
- Severity summary cards
- Findings-by-severity visualisation
- Findings distribution doughnut
- Overall Risk Score doughnut
- Risk level: Minimal, Low, Medium, or High
- Search functionality
- Severity filtering
- Rule omission controls
- Run Scan control
- Omitted Rules display
- Detailed findings table

Findings are ordered by severity and then by rule number to make higher-priority findings easier to review.

---

## API Endpoints

### Get Latest Scan Results

```http
GET /api/security-scanner/results
```

Returns the most recently generated scan results.

### Run Security Scan

```http
POST /api/security-scanner/scan
```

Runs the scanner and returns the new results.

Rules selected for omission are sent in the request body.

Example:

```json
{
  "omittedRules": [
    "NH003",
    "NH010"
  ]
}
```

### Get Available Rules

```http
GET /api/security-scanner/rules
```

Returns the available scanner rules used to populate the dashboard's rule-omission control.

---

## Running the Framework

### 1. Install Backend Dependencies

From the NutriHelp API project directory:

```bash
npm install
```

### 2. Configure the Backend

Ensure the normal NutriHelp backend environment configuration is available, including the required `.env` values used by the application.

### 3. Start the Backend

Run the backend using the project's normal start command, for example:

```bash
npm start
```

### 4. Open the Dashboard

Open:

```text
http://localhost:8081/security-dashboard
```

### 5. Configure the Scan

Use **Omit Rules** if any rules should be excluded from the current scan.

### 6. Run the Scan

Select **Run Scan**.

The framework will:

1. Load the scanner configuration.
2. Discover supported backend files.
3. Load the security rule library.
4. Remove any rules selected for omission.
5. Analyse the discovered source files.
6. Generate security findings.
7. Calculate the summary and Risk Score.
8. Save the results.
9. Refresh the dashboard with the latest scan.

---

## Scan Output

The latest structured scan output is stored in:

```text
security/output/scan-results.json
```

A simplified result structure is:

```json
{
  "framework": {
    "name": "Secure Code Analysis Framework"
  },
  "scanInformation": {
    "timestamp": "...",
    "filesScanned": 0,
    "rulesLoaded": 0,
    "rulesOmitted": 0,
    "findingsDetected": 0
  },
  "summary": {
    "severity": {
      "Critical": 0,
      "High": 0,
      "Medium": 0,
      "Low": 0,
      "Informational": 0
    }
  },
  "omittedRules": [],
  "findings": []
}
```

---

## Scanner Testing

Supporting test scripts are included in `security/core/`:

```text
testConfiguration.js
testfileDiscovery.js
testRuleManager.js
testAnalysisEngine.js
```

They were used during development to verify configuration loading, file discovery, security rule loading, and full scanner execution.

Temporary deliberately vulnerable test files used while validating detection rules are not required for normal operation of the framework.

---

## Limitations

This framework is a lightweight static analysis tool and is not intended to replace a commercial SAST platform or manual secure-code review.

Because detection is primarily rule and pattern based:

- Some findings may require manual validation.
- False positives can occur.
- A pattern match does not automatically prove that a vulnerability is exploitable.
- Results depend on the quality and coverage of the rule library.
- Runtime behaviour and vulnerabilities requiring dynamic analysis may not be detected.

Findings should therefore be treated as security review indicators that help direct further investigation.

---

## Future Development

Possible future improvements include:

- Additional security rules
- Improved contextual analysis
- Expanded CWE and OWASP mappings
- More advanced confidence scoring
- Historical scan comparison
- Trend reporting
- Exportable security reports
- Improved false-positive handling
- Additional supported source-code languages

---

## Project Context

The Secure Code Analysis Framework was developed as a cybersecurity contribution to the NutriHelp project.

Its purpose is to provide developers with a lightweight and understandable method of identifying potentially insecure coding patterns earlier in the development process while presenting the results in a format that can be reviewed without manually inspecting raw scanner output.
