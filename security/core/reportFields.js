/**
 * CS-13 checklist item 2: "Include severity, rule IDs, filenames, line numbers,
 * and findings" in every exported report (JSON and CSV).
 *
 */

// Maps the checklist wording to the actual property name on a finding object,
// as produced by security/core/analysisEngine.js.
const REQUIRED_FINDING_FIELDS = [
  { checklistTerm: 'severity', property: 'severity' },
  { checklistTerm: 'rule ID', property: 'ruleId' },
  { checklistTerm: 'filename', property: 'file' },
  { checklistTerm: 'line number', property: 'line' },
  { checklistTerm: 'finding (rule name)', property: 'ruleName' },
  { checklistTerm: 'finding (recommendation)', property: 'recommendation' },
];

/**
 * Suggested CSV column order/header row, in the same order as
 * REQUIRED_FINDING_FIELDS plus useful extras already present on every finding.
 * A CSV exporter can import this directly to build its header row.
 */
const CSV_COLUMNS = [
  { header: 'File', property: 'file' },
  { header: 'Line', property: 'line' },
  { header: 'Rule ID', property: 'ruleId' },
  { header: 'Rule Name', property: 'ruleName' },
  { header: 'Severity', property: 'severity' },
  { header: 'Confidence', property: 'confidence' },
  { header: 'CWE', property: 'cwe' },
  { header: 'OWASP', property: 'owasp' },
  { header: 'Recommendation', property: 'recommendation' },
];

/**
 * Checks a single finding object against REQUIRED_FINDING_FIELDS.
 * Returns an array of missing/empty property names (empty array = valid).
 */
function validateFinding(finding) {
  if (!finding || typeof finding !== 'object') {
    return REQUIRED_FINDING_FIELDS.map((f) => f.property);
  }

  const missing = [];

  REQUIRED_FINDING_FIELDS.forEach(({ property }) => {
    const value = finding[property];
    const isMissing =
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim().length === 0);

    if (isMissing) {
      missing.push(property);
    }
  });

  return missing;
}

/**
 * Validates every finding in a results object (as produced by
 * ResultsManager.createResults / returned by GET /api/security-scanner/results).
 * Returns { valid: boolean, invalidFindings: [{ index, missingFields }] }.
 */
function validateResults(results) {
  const findings = results && Array.isArray(results.findings) ? results.findings : null;

  if (!findings) {
    return {
      valid: false,
      invalidFindings: [],
      error: 'results.findings is missing or not an array',
    };
  }

  const invalidFindings = [];

  findings.forEach((finding, index) => {
    const missingFields = validateFinding(finding);
    if (missingFields.length > 0) {
      invalidFindings.push({ index, missingFields });
    }
  });

  return {
    valid: invalidFindings.length === 0,
    invalidFindings,
  };
}

module.exports = {
  REQUIRED_FINDING_FIELDS,
  CSV_COLUMNS,
  validateFinding,
  validateResults,
};