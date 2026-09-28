const { expect } = require('chai');
const fs = require('fs');
const os = require('os');
const path = require('path');

const AnalysisEngine = require('../security/core/analysisEngine');
const ResultsManager = require('../security/core/resultsManager');
const { validateFinding, validateResults, REQUIRED_FINDING_FIELDS, CSV_COLUMNS } = require('../security/core/reportFields');

/**
 * CS-13 checklist item 2: "Include severity, rule IDs, filenames, line numbers,
 * and findings" in every exported report.
 *
 * This test proves the requirement end-to-end: run the real AnalysisEngine
 * against a fixture file containing a genuine rule match, build results the
 * same way testAnalysisEngine.js does, then verify every finding carries all
 * required fields via the shared reportFields contract. Any export format
 * (JSON today, CSV once built) that serialises these finding objects will
 * automatically satisfy checklist item 2.
 */

describe('CS-13 checklist item 2 — required report fields', ()=> {
  let tempDir;
  let fixtureFile;

  const fakeRule = {
    id: 'NH051',
    name: 'Hardcoded AWS Access Key',
    // Matches the same pattern shape used in security/rules/rules.json
    compiledPattern: /AKIA[0-9A-Z]{16}/,
    severity: 'Critical',
    confidence: 'High',
    cwe: 'CWE-798',
    owasp: 'A07:2021',
    recommendation: 'Store AWS credentials in environment variables or an approved secrets manager.',
  };

  before(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cs13-fixture-'));
    fixtureFile = path.join(tempDir, 'exampleConfig.js');
    fs.writeFileSync(
      fixtureFile,
      "const key = 'AKIAABCDEFGHIJKLMNOP';\n"
    );
  });

  after(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('produces at least one finding for the fixture file', () => {
    const engine = new AnalysisEngine([fakeRule]);
    const findings = engine.analyseFiles([fixtureFile]);

    expect(findings).to.have.length.greaterThan(0);
  });

  it('every finding carries all fields required by checklist item 2', () => {
    const engine = new AnalysisEngine([fakeRule]);
    const findings = engine.analyseFiles([fixtureFile]);

    findings.forEach((finding) => {
      const missing = validateFinding(finding);
      expect(missing, `finding missing fields: ${missing.join(', ')}`).to.have.length(0);
    });
  });

  it('a finding\'s field values match what the checklist actually asks for', () => {
    const engine = new AnalysisEngine([fakeRule]);
    const [finding] = engine.analyseFiles([fixtureFile]);

    expect(finding.severity).to.equal('Critical');       // severity
    expect(finding.ruleId).to.equal('NH051');             // rule ID
    expect(finding.file).to.equal(fixtureFile);           // filename
    expect(finding.line).to.equal(1);                     // line number
    expect(finding.ruleName).to.equal('Hardcoded AWS Access Key'); // finding description
  });

  it('ResultsManager.createResults preserves all required fields end-to-end', () => {
    const engine = new AnalysisEngine([fakeRule]);
    const findings = engine.analyseFiles([fixtureFile]);
    const resultsManager = new ResultsManager();

    const results = resultsManager.createResults([fixtureFile], [fakeRule], findings, 42);

    const validation = validateResults(results);
    expect(validation.valid, JSON.stringify(validation.invalidFindings)).to.equal(true);
  });

  it('flags a finding as invalid if a required field is missing (sanity check on the validator itself)', () => {
    const incompleteFinding = {
      file: '/some/file.js',
      line: 10,
      // ruleId intentionally omitted
      ruleName: 'Test Rule',
      severity: 'High',
      recommendation: 'Fix it.',
    };

    const missing = validateFinding(incompleteFinding);
    expect(missing).to.include('ruleId');
  });

  it('REQUIRED_FINDING_FIELDS covers every checklist term with no gaps', () => {
    const terms = REQUIRED_FINDING_FIELDS.map((f) => f.checklistTerm);

    expect(terms.some((t) => t.includes('severity'))).to.equal(true);
    expect(terms.some((t) => t.includes('rule ID'))).to.equal(true);
    expect(terms.some((t) => t.includes('filename'))).to.equal(true);
    expect(terms.some((t) => t.includes('line number'))).to.equal(true);
    expect(terms.some((t) => t.includes('finding'))).to.equal(true);
  });

  it('CSV_COLUMNS is available for the Task 1 CSV export to import directly', () => {
    expect(CSV_COLUMNS).to.be.an('array').with.length.greaterThan(0);
    CSV_COLUMNS.forEach((col) => {
      expect(col).to.have.property('header');
      expect(col).to.have.property('property');
    });
  });
});