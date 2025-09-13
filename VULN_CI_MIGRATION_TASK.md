# Vulnerability Scanner CI Migration Task (V1.4 -> V2.0)

This document is a handover for the next developer to migrate `.github/workflows/security.yml` from invoking
`Vulnerability_Tool/Vulnerability_Scanner_V1.4.py` to using `Vulnerability_Tool_V2/scanner_v2.py`.

Goal
- Run the V2.0 scanner in GitHub Actions to produce human-readable HTML (recommended) and/or JSON reports and
  upload them as artifacts.
- Keep reproducibility by preferring the repository-provided venv setup (`setup_venv.sh`) and consider caching to
  reduce CI time.

Acceptance criteria
1. Actions produces a report file (HTML or JSON) under `Vulnerability_Tool_V2/reports/` and uploads it as an artifact.
   Suggested filename: `security_report_${{ github.sha }}.html`.
2. Decide and document whether CRITICAL findings should fail the CI job (i.e. block PRs) and reflect that decision in
   the workflow (comments or parameters).
3. Document performance / caching recommendations (for example, use `actions/cache` to cache pip wheels or pip cache
   directories).

Key information
- V2 CLI entry: `Vulnerability_Tool_V2/scanner_v2.py`. Required argument: `--target` (target directory). Optional flags:
  `--format` (json|html|summary), `--output` (write output file), and `--verbose`.
- Recommended: use the repo script to create a virtual environment: `Vulnerability_Tool_V2/setup_venv.sh` which will
  create `Vulnerability_Tool_V2/venv` and install dependencies from `requirements.txt`.

Recommended implementation (preferred: use repository venv)

Replace the existing step that used to run V1 against each changed file with the snippet below. Adjust to your job
context and branching strategy as needed.

```yaml
# ...existing job steps...
- name: Set up Python venv for scanner
  run: |
    cd Vulnerability_Tool_V2
    chmod +x ./setup_venv.sh || true
    ./setup_venv.sh

- name: Run Vulnerability_Tool_V2 scanner
  run: |
    SCAN_OUTPUT=Vulnerability_Tool_V2/reports/security_report_${{ github.sha }}.html
    Vulnerability_Tool_V2/venv/bin/python Vulnerability_Tool_V2/scanner_v2.py --target . --format html --output "$SCAN_OUTPUT" --verbose
    ls -la Vulnerability_Tool_V2/reports || true

- name: Upload scanner report
  uses: actions/upload-artifact@v4
  with:
    name: security-scan-report
    path: Vulnerability_Tool_V2/reports/security_report_${{ github.sha }}.html
```

Minimal alternative (do not create venv; use system Python)

```yaml
- name: Install scanner deps (system python)
  run: |
    python3 -m pip install --upgrade pip
    pip install -r Vulnerability_Tool_V2/requirements.txt

- name: Run scanner (system python)
  run: |
    python3 Vulnerability_Tool_V2/scanner_v2.py --target . --format html --output Vulnerability_Tool_V2/reports/security_report_${{ github.sha }}.html
```

Notes and optimizations
- Caching: use `actions/cache` to speed up dependency installation (cache pip wheel files or pip cache directories).
- Exit code behavior: V2 will return a non-zero exit code if CRITICAL issues are found (the CLI returns 1 on
  critical findings). If you want PRs to be blocked on criticals, keep this behavior. Otherwise, use
  `continue-on-error: true` for the scanner step or capture the exit code and treat it as a warning while still
  uploading the report.
- Scan scope: V1 was scanning changed files one-by-one. V2 is intended to scan directories. If you want to scan only
  changed files, you can copy changed files to a temporary directory in the job and use `--target` to point to that
  temporary directory, or adapt scanner configuration to accept a file-list.

Additional resources
- Scanner entrypoint: `Vulnerability_Tool_V2/scanner_v2.py`
- Requirements: `Vulnerability_Tool_V2/requirements.txt`
- venv setup script: `Vulnerability_Tool_V2/setup_venv.sh`

Handover
Assign this task to the person responsible for CI and link this document in the issue/PR. Include the acceptance
criteria in the PR description when implementing the change.
